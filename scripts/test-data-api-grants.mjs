import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareSnapshots } from './data-api-grants/metadata.mjs'
import { schemaReplay, wrapGrantArtifact } from './lib/schema-replay.mjs'
import { assertSnapshotContract, parseProofArguments, proofDirectory,
  proofUsage, stopProofDatabase, writeProofSnapshot } from './data-api-grants/proof-support.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'scripts/migration-grants.config.json'), 'utf8'))
const project = `grants-${randomUUID().slice(0, 8)}`
const scratch = mkdtempSync(join(tmpdir(), `${project}-`))
const migrations = join(scratch, 'supabase/migrations')
const container = `supabase_db_${project}`
const lifecycle = { project, container, scratch, startAttempted: false, started: false }
const snapshotSql = readFileSync(join(root, 'scripts/data-api-grants/snapshot.sql'), 'utf8')
const run = (command, args, input) => execFileSync(command, args, {
  cwd: root, input, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  stdio: ['pipe', 'pipe', 'pipe'],
})
const query = (sql) => run('docker', ['exec', '-i', container, 'psql', '-U', 'postgres',
  '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt'], sql)
const snapshot = () => JSON.parse(query(snapshotSql))
let outputDirectory = scratch

function capture(name) {
  const current = snapshot()
  writeProofSnapshot(outputDirectory, name, current)
  return current
}

function prepare() {
  mkdirSync(migrations, { recursive: true })
  writeFileSync(join(scratch, 'supabase/config.toml'), `project_id = "${project}"
[api]
enabled = false
port = 56321
[db]
port = 56322
shadow_port = 56320
major_version = 17
[db.seed]
enabled = false
[studio]
enabled = false
[auth]
enabled = false
[storage]
enabled = true
[realtime]
enabled = false
[analytics]
enabled = false
[edge_runtime]
enabled = false
`)
  assert.equal(config.mode, 'schema', 'H1B database proof requires schema mode')
  const sources = config.schemaFiles.map((file) => readFileSync(join(root, file), 'utf8'))
  writeFileSync(join(migrations, '20261006000000_schema.sql'), schemaReplay(sources).sql)
  writeFileSync(join(migrations, '00000000000000_LOCAL_ONLY_simulate_oct30.sql'),
    'alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;\n'
    + 'alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;\n')
}

function verifySentinels() {
  const sql = readFileSync(join(root, 'scripts/data-api-grants/sentinels.sql'), 'utf8')
  query(`begin; ${sql} rollback;`)
  for (const grant of [
    'grant insert on tables to anon',
    'grant select on sequences to authenticated',
  ]) {
    assert.throws(() => query(`begin;
      alter default privileges for role postgres in schema public ${grant};
      ${sql} rollback;`), /Unexpected default access/,
    `Sentinel must detect permissive defaults: ${grant}`)
  }
}

function verifySchemaUsage(baseline) {
  const grants = baseline.split('\n').filter((line) => line.startsWith('grant ') && line.includes(' on schema '))
  assert.equal(grants.length, 3, 'Expected explicit public-schema USAGE for all three API roles')
  const check = "select bool_or(has_schema_privilege(role, 'public', 'USAGE')) from unnest(array['anon','authenticated','service_role']) r(role)"
  const restored = check.replace('bool_or', 'bool_and')
  query(`begin;
    revoke usage on schema public from public, anon, authenticated, service_role;
    do $$ begin if (${check}) then raise exception 'Schema negative control still has access'; end if; end $$;
    ${grants.join('\n')}
    do $$ begin if not (${restored}) then raise exception 'Explicit schema grants did not restore access'; end if; end $$;
    rollback;`)
}

function verifyReplayFiles() {
  const block = wrapGrantArtifact('begin;\ngrant select on public.proof_parent to anon;\ncommit;')
  const { sql } = schemaReplay([
    `create table public.proof_parent(id int primary key);\n${block}\ncreate table public.proof_suffix(id int);`,
    'create table public.proof_child(parent_id int references public.proof_parent(id));',
  ])
  query(`begin; ${sql}
    insert into public.proof_parent values(7);
    insert into public.proof_child values(7);
    insert into public.proof_suffix values(7);
    do $$ begin
      if not exists(select 1 from public.proof_child join public.proof_parent on parent_id=id)
        then raise exception 'Multi-file replay lost a schema dependency'; end if;
    end $$;
    rollback;`)
}

function proof() {
  const expected = JSON.parse(readFileSync(join(root, 'scripts/data-api-grants/expected-summary.json'), 'utf8'))
  const without = capture('without-baseline')
  assertSnapshotContract(without, { objects: expected.objects }, join(outputDirectory, 'without-baseline.json'), ['objects'])
  const baseline = readFileSync(join(root, config.baselineFile), 'utf8')
  query(baseline)
  const withBaseline = capture('with-baseline')
  assertSnapshotContract(withBaseline, expected, join(outputDirectory, 'with-baseline.json'))
  assert.deepEqual([...new Set(withBaseline.effective_relations.filter((row) => row.kind === 'S')
    .map((row) => row.privilege))].sort(), ['SELECT', 'UPDATE', 'USAGE'],
  'Snapshot must check every sequence privilege')
  assert.ok(compareSnapshots(without, withBaseline).some((diff) => diff.category === 'effective_relations'),
    'Negative control must lose effective relation access')
  query(baseline)
  assert.deepEqual(compareSnapshots(withBaseline, capture('reapplied')), [], 'Reapplication must preserve every permission tuple')
  verifySentinels()
  verifySchemaUsage(baseline)
  verifyReplayFiles()
  assert.deepEqual(compareSnapshots(withBaseline, capture('after-fixtures')), [], 'Fixture and sentinel checks must roll back')
}

let success = false
try {
  const options = parseProofArguments(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(proofUsage)
  } else {
    outputDirectory = proofDirectory(options.snapshotDirectory, scratch)
    prepare()
    lifecycle.startAttempted = true
    try {
      run('supabase', ['db', 'start', '--workdir', scratch])
      lifecycle.started = true
    }
    catch (error) {
      writeFileSync(join(scratch, 'startup.log'), `${error.stdout ?? ''}\n${error.stderr ?? ''}`)
      throw new Error(`Disposable database startup failed. Inspect ${join(scratch, 'startup.log')}`)
    }
    query("do $$ begin if to_regclass('cron.job') is not null then perform cron.unschedule(jobid) from cron.job; end if; end $$;")
    proof()
    process.stdout.write('Data API proof passed: fresh replay, full permission contract, negative control, idempotency, private sentinels, and role checks.\n')
    if (options.snapshotDirectory) process.stdout.write(`Proof snapshots: ${outputDirectory}\n`)
    success = true
  }
} catch (error) {
  process.stderr.write(`${error.stack}\n`)
  process.stderr.write(`Proof snapshots: ${outputDirectory}\n`)
  process.exitCode = 1
} finally {
  // Stop a successful start, or this invocation's partially created database.
  try { stopProofDatabase(lifecycle, run) }
  catch (error) { process.stderr.write(`Cleanup failed for ${project}: ${error.message}\n`); process.exitCode = 1 }
  if (success || !lifecycle.startAttempted) rmSync(scratch, { recursive: true })
}

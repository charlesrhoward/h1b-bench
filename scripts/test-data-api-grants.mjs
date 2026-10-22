import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, cpSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareSnapshots, summarize } from './data-api-grants/metadata.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'scripts/migration-grants.config.json'), 'utf8'))
const project = `grants-${randomUUID().slice(0, 8)}`
const scratch = mkdtempSync(join(tmpdir(), `${project}-`))
const migrations = join(scratch, 'supabase/migrations')
const container = `supabase_db_${project}`
const snapshotSql = readFileSync(join(root, 'scripts/data-api-grants/snapshot.sql'), 'utf8')
const run = (command, args, input) => execFileSync(command, args, {
  cwd: root, input, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  stdio: ['pipe', 'pipe', 'pipe'],
})
const query = (sql) => run('docker', ['exec', '-i', container, 'psql', '-U', 'postgres',
  '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt'], sql)
const snapshot = () => JSON.parse(query(snapshotSql))

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
  if (config.mode === 'migrations') {
    for (const name of readdirSync(join(root, config.directory))) {
      if (name.endsWith('.sql') && name !== config.baseline) cpSync(join(root, config.directory, name), join(migrations, name))
    }
  } else {
    const sql = readFileSync(join(root, config.schemaFiles[0]), 'utf8')
    assert.ok(sql.includes('-- BEGIN explicit Data API grants'), 'Expected the generated schema grants block')
    writeFileSync(join(migrations, '20261006000000_schema.sql'), sql.split('-- BEGIN explicit Data API grants')[0])
  }
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

function verifyResortSchema() {
  if (config.mode !== 'migrations') return
  const expected = JSON.parse(readFileSync(join(root, 'scripts/data-api-grants/resort-schema.expected.json'), 'utf8'))
  const actual = JSON.parse(query(readFileSync(join(root, 'scripts/data-api-grants/resort-schema.sql'), 'utf8')))
  delete actual.ledger_matches
  assert.deepEqual(actual, expected, 'Recovered resort schema must match production metadata')
  query(readFileSync(join(root, 'scripts/data-api-grants/resort-access.sql'), 'utf8'))
}

function proof() {
  const expected = JSON.parse(readFileSync(join(root, 'scripts/data-api-grants/expected-summary.json'), 'utf8'))
  const without = snapshot()
  assert.deepEqual(summarize(without).objects, expected.objects, 'Negative control must contain the same objects')
  const baselineFile = config.baselineFile ?? join(config.directory, config.baseline)
  query(readFileSync(join(root, baselineFile), 'utf8'))
  const withBaseline = snapshot()
  assert.deepEqual(summarize(withBaseline), expected, 'Full rebuilt permissions must match the production contract')
  assert.deepEqual([...new Set(withBaseline.effective_relations.filter((row) => row.kind === 'S')
    .map((row) => row.privilege))].sort(), ['SELECT', 'UPDATE', 'USAGE'],
  'Snapshot must check every sequence privilege')
  assert.ok(compareSnapshots(without, withBaseline).some((diff) => diff.category === 'effective_relations'),
    'Negative control must lose effective relation access')
  for (const name of config.preBaselineMigrations ?? []) query(readFileSync(join(root, config.directory, name), 'utf8'))
  query(readFileSync(join(root, baselineFile), 'utf8'))
  assert.deepEqual(compareSnapshots(withBaseline, snapshot()), [], 'Reapplication must preserve every permission tuple')
  verifySentinels()
  verifyResortSchema()
  assert.deepEqual(compareSnapshots(withBaseline, snapshot()), [], 'Fixture and sentinel checks must roll back')
}

let success = false
try {
  if (process.argv.includes('--help')) {
    process.stdout.write('Usage: node scripts/test-data-api-grants.mjs\nRequires Supabase CLI, Docker, and free local ports 56320–56322. Uses only its unique disposable project.\n')
  } else {
    if (process.argv.length > 2) throw new Error('Unexpected argument; use --help')
    prepare()
    try { run('supabase', ['db', 'start', '--workdir', scratch]) }
    catch (error) {
      writeFileSync(join(scratch, 'startup.log'), `${error.stdout ?? ''}\n${error.stderr ?? ''}`)
      throw new Error(`Disposable database startup failed. Inspect ${join(scratch, 'startup.log')}`)
    }
    query("do $$ begin if to_regclass('cron.job') is not null then perform cron.unschedule(jobid) from cron.job; end if; end $$;")
    proof()
    process.stdout.write('Data API proof passed: fresh replay, full permission contract, negative control, idempotency, private sentinels, and role checks.\n')
    success = true
  }
} catch (error) {
  process.stderr.write(`${error.stack}\n`)
  process.exitCode = 1
} finally {
  // Never stop a project that this invocation did not create.
  if (success || readdirSync(scratch).includes('supabase')) {
    try { run('supabase', ['stop', '--project-id', project, '--no-backup', '--workdir', scratch]) }
    catch (error) { process.stderr.write(`Cleanup failed for ${project}: ${error.message}\n`); process.exitCode = 1 }
  }
  if (success || !readdirSync(scratch).includes('supabase')) rmSync(scratch, { recursive: true })
}

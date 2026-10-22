import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { assertGrantArtifact, grantEnd, grantStart, schemaReplay, wrapGrantArtifact } from './lib/schema-replay.mjs'
import { assertSnapshotContract, parseProofArguments, proofDirectory,
  writeProofSnapshot } from './data-api-grants/proof-support.mjs'
import { summarize } from './data-api-grants/metadata.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
test('fresh-schema grants equal the reviewed production artifact', async () => {
  const config = JSON.parse(await readFile(resolve(root, 'scripts/migration-grants.config.json'), 'utf8'))
  const sources = await Promise.all(config.schemaFiles.map((file) => readFile(resolve(root, file), 'utf8')))
  const artifact = await readFile(resolve(root, config.baselineFile), 'utf8')
  assertGrantArtifact(sources, artifact)
})

const artifact = 'begin;\ngrant select on public.parent to anon;\ncommit;'
const block = wrapGrantArtifact(artifact)
test('replay includes every schema in order and preserves SQL after the grant block', () => {
  const sources = [`create table public.parent(id int primary key);\n${block}\nselect 7;`,
    'create table public.child(parent_id int references public.parent(id));']
  const replay = schemaReplay(sources).sql
  assert.ok(replay.includes('select 7;'))
  assert.ok(replay.indexOf('create table public.parent') < replay.indexOf('create table public.child'))
  assert.ok(replay.includes('create table public.child'))
  assert.ok(!replay.includes('grant select'))
  assertGrantArtifact(sources, artifact)
})
for (const malformed of ['', grantStart, grantEnd, `${grantEnd}\n${grantStart}`, `${block}\n${block}`]) {
  test(`rejects missing, repeated or reversed markers: ${JSON.stringify(malformed)}`, () => {
    assert.throws(() => schemaReplay([malformed]))
  })
}
test('rejects grant blocks duplicated across registered files', () => {
  assert.throws(() => schemaReplay([block, block]), /exactly one/)
  assert.throws(() => schemaReplay([]), /at least one/)
})
for (const changed of [artifact.replace('begin;\n', ''), artifact.replace('commit;', ''),
  artifact.replace('commit;', 'revoke all on public.parent from anon;\ncommit;')]) {
  test('full equality detects wrapper and non-GRANT changes', () => {
    assert.throws(() => assertGrantArtifact([wrapGrantArtifact(changed)], artifact), /complete grant block/)
  })
}
test('matching schema and artifact still require a complete transaction wrapper', () => {
  const invalid = artifact.replace('commit;', '')
  assert.throws(() => assertGrantArtifact([wrapGrantArtifact(invalid)], invalid), /transaction wrapper/)
})
test('proof CLI accepts snapshot output and rejects unsupported or missing arguments', () => {
  assert.equal(parseProofArguments(['-h']).help, true)
  assert.equal(parseProofArguments(['--snapshot-dir', '/tmp/proof']).snapshotDirectory, '/tmp/proof')
  assert.throws(() => parseProofArguments(['--refresh-expected']))
  assert.throws(() => parseProofArguments(['--snapshot-dir']))
  assert.throws(() => parseProofArguments(['unexpected']))
})
test('contract mismatch identifies the category and preserves private actual rows', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'proof-diagnostics-'))
  try {
    const output = proofDirectory(directory, '/unused')
    assert.notEqual(proofDirectory(directory, '/unused'), output)
    assert.equal(proofDirectory(undefined, directory), directory)
    const actual = { objects: [{ name: 'new_table' }] }
    const path = writeProofSnapshot(output, 'actual', actual)
    const expected = summarize({ objects: [] })
    assert.throws(() => assertSnapshotContract(actual, expected, path),
      (error) => error.message.includes('objects') && error.message.includes(path)
        && error.message.includes('inspect.mjs compare'))
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), actual)
    assert.equal((await stat(path)).mode & 0o777, 0o600)
    assert.equal((await stat(output)).mode & 0o777, 0o700)
    assertSnapshotContract(actual, summarize(actual), path)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

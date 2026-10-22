import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm, stat, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { assertSecurityPosture } from './data-api-grants/security-posture.mjs'
import { assertSnapshotContract, proofDirectory, writeProofSnapshot } from './data-api-grants/proof-support.mjs'
import { compareSnapshots, summarize } from './data-api-grants/metadata.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contract = { writePolicies: [], writableViews: [] }
function snapshot() {
  return {
    objects: [{ schema: 'public', name: 'records', kind: 'r', owner: 'postgres', rls: true },
      { schema: 'public', name: 'report', kind: 'v', owner: 'postgres', rls: false }],
    roles: ['anon', 'authenticated', 'service_role'].map((role) => ({ role,
      bypass_rls: role === 'service_role', superuser: false, inherited: [] })),
    policies: [{ schema: 'public', name: 'records', policy: 'read_rows', command: 'SELECT',
      roles: ['public'], permissive: 'PERMISSIVE', using_expression: 'true', check_expression: null }],
    views: [{ schema: 'public', name: 'report', owner: 'postgres', options: ['security_invoker=true'],
      security_invoker: true, updatable: 0 }],
  }
}

test('security invariants remain independent of regenerated expected digests', () => {
  const actual = snapshot()
  assertSecurityPosture(actual, contract)
  actual.objects[0].rls = false
  assertSnapshotContract(actual, summarize(actual), '/private/actual.json')
  assert.throws(() => assertSecurityPosture(actual, contract), /RLS must be enabled: public.records/)
})

for (const command of ['INSERT', 'UPDATE', 'DELETE', 'ALL']) {
  test(`rejects unreviewed ${command} policies, including PUBLIC and authenticated`, () => {
    for (const role of ['public', 'anon', 'authenticated']) {
      const actual = snapshot()
      actual.policies.push({ ...actual.policies[0], policy: 'public_write', command, roles: [role] })
      assert.throws(() => assertSecurityPosture(actual, contract), /Unreviewed write policy/)
    }
  })
}

test('reviewed writes retain exact roles, conditions, command and permissiveness', () => {
  const actual = snapshot()
  const policy = { ...actual.policies[0], policy: 'own_rows', command: 'ALL',
    roles: ['authenticated'], using_expression: '(auth.uid() = owner_id)',
    check_expression: '(auth.uid() = owner_id)' }
  const allowed = { ...contract, writePolicies: [policy] }
  actual.policies.push({ ...policy })
  assertSecurityPosture(actual, allowed)
  for (const change of [{ using_expression: 'true' }, { check_expression: 'true' },
    { roles: ['public'] }, { command: 'INSERT' }, { permissive: 'RESTRICTIVE' }]) {
    actual.policies[1] = { ...policy, ...change }
    assert.throws(() => assertSecurityPosture(actual, allowed), /Write policy changed/)
  }
  actual.policies.pop()
  assert.throws(() => assertSecurityPosture(actual, allowed), /inventory changed/)
})

test('public API roles cannot bypass RLS, inherit privileges or own tables', () => {
  for (const change of [{ bypass_rls: true }, { superuser: true }, { inherited: ['postgres'] }]) {
    const actual = snapshot()
    Object.assign(actual.roles[0], change)
    assert.throws(() => assertSecurityPosture(actual, contract))
  }
  const actual = snapshot()
  actual.objects[0].owner = 'anon'
  assert.throws(() => assertSecurityPosture(actual, contract), /Public role owns table/)
})

test('every ordinary view must retain invoker security and reviewed writability', () => {
  const actual = snapshot()
  actual.views[0].security_invoker = false
  assert.throws(() => assertSecurityPosture(actual, contract), /must use security_invoker/)
  actual.views[0].security_invoker = true
  actual.views[0].updatable = 28
  assert.throws(() => assertSecurityPosture(actual, contract), /must be read-only/)
  assertSecurityPosture(actual, { ...contract, writableViews: ['report'] })
  actual.views = []
  assert.throws(() => assertSecurityPosture(actual, contract), /Missing view security metadata/)
})

test('policy and view metadata changes affect full summaries and tuple comparisons', () => {
  const before = snapshot()
  const after = snapshot()
  after.policies[0].using_expression = 'false'
  after.views[0].options = []
  assert.notDeepEqual(summarize(before).policies, summarize(after).policies)
  assert.notDeepEqual(summarize(before).views, summarize(after).views)
  assert.deepEqual([...new Set(compareSnapshots(before, after).map((row) => row.category))].sort(), ['policies', 'views'])
  assert.throws(() => assertSnapshotContract(before, { objects: summarize(before).objects }, '/private/actual.json'),
    /permission categories/)
  for (const category of ['policies', 'views', 'roles', 'objects']) {
    const incomplete = snapshot()
    delete incomplete[category]
    assert.throws(() => assertSecurityPosture(incomplete, contract), /Missing security metadata/)
  }
})

test('nested security fields are compared completely regardless of object key order', () => {
  const before = { policies: [{ details: { nested: { allowed: false, role: 'anon' } } }] }
  const reordered = { policies: [{ details: { nested: { role: 'anon', allowed: false } } }] }
  const changed = { policies: [{ details: { nested: { allowed: true, role: 'anon' } } }] }
  assert.deepEqual(compareSnapshots(before, reordered), [])
  assert.equal(compareSnapshots(before, changed).length, 2)
  assert.notDeepEqual(summarize(before), summarize(changed))
})

test('snapshot output rejects worktrees, other Git repositories and symlink aliases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'private-proof-path-'))
  try {
    for (const path of [root, join(root, 'scripts'), join(root, 'uncreated-proof/subdirectory')]) {
      assert.throws(() => proofDirectory(path, directory), /outside Git/)
    }
    assert.throws(() => proofDirectory(undefined, join(root, 'uncreated-proof')), /outside Git/)
    await symlink(root, join(directory, 'alias'))
    assert.throws(() => proofDirectory(join(directory, 'alias/new-output'), directory), /outside Git/)
    const other = join(directory, 'other-repository')
    execFileSync('git', ['init', '--quiet', other])
    for (const path of [other, join(other, '.git'), join(other, 'new-output')]) {
      assert.throws(() => proofDirectory(path, directory), /outside Git/)
    }
    const output = proofDirectory(join(directory, 'private/new-output'), directory)
    const path = writeProofSnapshot(output, 'actual', snapshot())
    assert.equal((await stat(path)).mode & 0o777, 0o600)
    assert.equal((await stat(output)).mode & 0o777, 0o700)
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), snapshot())
    assert.equal(proofDirectory(undefined, directory), await realpath(directory))
  } finally { await rm(directory, { recursive: true, force: true }) }
})

import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { auditMigrationGrants, findGrantProblems } from './check-migration-grants.mjs'
import { generateGrants, compareSnapshots } from './data-api-grants/metadata.mjs'

for (const statement of [
  'CREATE TABLE public.missing(id int);',
  'CREATE TABLE IF NOT EXISTS public.missing(id int);',
  'CREATE UNLOGGED TABLE public.missing(id int);',
  'CREATE VIEW public.missing AS SELECT 1;',
  'CREATE OR REPLACE VIEW public.missing AS SELECT 1;',
  'CREATE RECURSIVE VIEW public.missing(n) AS SELECT 1;',
  'CREATE OR REPLACE RECURSIVE VIEW public.missing(n) AS SELECT 1;',
  'CREATE MATERIALIZED VIEW public.missing AS SELECT 1;',
  'CREATE SEQUENCE public.missing;',
  'DO $$ BEGIN CREATE TABLE public.missing(id int); END $$;',
]) {
  test(`rejects missing access decision: ${statement}`, () => assert.ok(findGrantProblems(statement).length))
}

for (const statement of [
  'CREATE TABLE public.ok(id int); GRANT SELECT ON TABLE public.ok TO anon;',
  'CREATE VIEW public.ok AS SELECT 1; REVOKE ALL ON public.ok FROM PUBLIC, anon, authenticated;',
  'CREATE RECURSIVE VIEW public.ok(n) AS SELECT 1; GRANT SELECT ON public.ok TO anon;',
  'CREATE SEQUENCE public.ok; GRANT USAGE ON SEQUENCE public.ok TO service_role;',
  'DO $$ BEGIN CREATE TABLE public.ok(id int); GRANT SELECT ON public.ok TO anon; END $$;',
  'CREATE TABLE public."Mixed.Case"(id int); GRANT SELECT ON public."Mixed.Case" TO anon;',
  'CREATE TABLE public."a""b"(id int); GRANT SELECT ON public."a""b" TO anon;',
  'CREATE TABLE private.ok(id int);',
  "INSERT INTO logs VALUES ('CREATE TABLE public.fake(id int);');",
  'INSERT INTO logs VALUES ($$CREATE TABLE public.fake(id int);$$);',
  '-- CREATE TABLE public.fake(id int);\n/* nested /* CREATE TABLE fake */ comment */ SELECT 1;',
]) {
  test(`accepts explicit decision or non-DDL: ${statement}`, () => assert.deepEqual(findGrantProblems(statement), []))
}

test('does not confuse sequences and tables with the same name', () => {
  assert.ok(findGrantProblems('CREATE SEQUENCE public.foo; GRANT SELECT ON TABLE public.foo TO anon;').length)
})
test('does not accept a grant to another schema', () => {
  assert.ok(findGrantProblems('CREATE TABLE public.foo(id int); GRANT SELECT ON private.foo TO anon;').length)
})
test('rejects dynamic DO-block DDL', () => {
  assert.ok(findGrantProblems("DO $$ BEGIN EXECUTE format('CREATE TABLE %I(id int)', 'foo'); END $$;").length)
})
test('rejects runtime DDL inside a function', () => {
  assert.ok(findGrantProblems('CREATE FUNCTION f() RETURNS void AS $$ BEGIN CREATE TABLE x(id int); END $$ LANGUAGE plpgsql;').length)
})
test('rejects runtime DDL and dynamic SQL in single-quoted routine bodies', () => {
  assert.ok(findGrantProblems("CREATE FUNCTION f() RETURNS void AS 'BEGIN CREATE TABLE public.x(id int); END' LANGUAGE plpgsql;").length)
  assert.ok(findGrantProblems("CREATE FUNCTION f() RETURNS void AS 'BEGIN EXECUTE command; END' LANGUAGE plpgsql;").length)
})
test('rejects unsupported routine-body quoting instead of skipping it', () => {
  assert.ok(findGrantProblems("CREATE FUNCTION f() RETURNS void AS E'BEGIN CREATE TABLE public.x(id int); END' LANGUAGE plpgsql;").length)
})
for (const kind of ['TABLES', 'SEQUENCES']) {
  test(`rejects blanket ${kind} grant`, () => {
    assert.ok(findGrantProblems(`GRANT ALL ON ALL ${kind} IN SCHEMA public TO anon;`).length)
  })
  test(`rejects blanket ${kind} grant when public follows another schema`, () => {
    assert.ok(findGrantProblems(`GRANT ALL ON ALL ${kind} IN SCHEMA private, public TO anon;`).length)
  })
}
test('fails on unterminated SQL instead of skipping it', () => {
  assert.throws(() => findGrantProblems("SELECT 'unterminated"))
})

test('migration adapter rejects unsupported, duplicate and backdated new names', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'migration-grants-'))
  try {
    await mkdir(join(directory, 'scripts'))
    await mkdir(join(directory, 'migrations'))
    await writeFile(join(directory, 'scripts/migration-grants.config.json'), JSON.stringify({
      mode: 'migrations', directory: 'migrations', baseline: '20261022000000_baseline.sql', historical: {},
    }))
    for (const name of ['20261022000000_baseline.sql', '20261023000000_a.sql', '20261023000000_b.sql', '20261021_short.sql', '20261021000000_old.sql']) {
      await writeFile(join(directory, 'migrations', name), '-- explicit historical metadata\n')
    }
    const { errors } = await auditMigrationGrants(directory)
    assert.ok(errors.some((error) => error.includes('unsupported')))
    assert.ok(errors.some((error) => error.includes('duplicate')))
    assert.ok(errors.some((error) => error.includes('backdated')))
    await rm(join(directory, 'migrations/20261022000000_baseline.sql'))
    assert.ok((await auditMigrationGrants(directory)).errors.some((error) => error.includes('missing baseline')))
    await rm(join(directory, 'migrations'), { recursive: true })
    await assert.rejects(auditMigrationGrants(directory), /ENOENT/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

const roles = ['anon', 'authenticated', 'service_role'].map((role) => ({ role, inherited: [] }))
test('catalog generator preserves materialized-view, sequence, column and grant-option ACLs', () => {
  const base = { schema: 'public', owner: 'postgres', grantor: 'postgres', grantee: 'anon', privilege: 'SELECT', grantable: false }
  const sql = generateGrants({ roles, relation_acl: [
    { ...base, name: 'report', kind: 'm' },
    { ...base, name: 'counter', kind: 'S', privilege: 'USAGE', grantable: true },
  ], column_acl: [{ ...base, name: 'restricted', column: 'allowed' }] })
  assert.match(sql, /on table "public"\."report" to "anon"/)
  assert.match(sql, /on sequence "public"\."counter" to "anon" with grant option/)
  assert.match(sql, /SELECT \("allowed"\) on table "public"\."restricted"/)
  assert.doesNotMatch(sql, /ALL|authenticated/)
})
test('schema adapter checks nested loader DDL and unregistered SQL files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'schema-grants-'))
  try {
    await mkdir(join(directory, 'scripts'))
    await mkdir(join(directory, 'etl/nested'), { recursive: true })
    await writeFile(join(directory, 'scripts/migration-grants.config.json'), JSON.stringify({
      mode: 'schema', schemaFiles: ['etl/schema.sql'], runtimeDirectory: 'etl',
    }))
    await writeFile(join(directory, 'etl/schema.sql'), 'CREATE TABLE public.foo(id int); GRANT SELECT ON public.foo TO anon;')
    await writeFile(join(directory, 'etl/nested/loader.py'), 'sql = "CREATE TABLE public.runtime_table(id int)"')
    await writeFile(join(directory, 'etl/nested/schema.sql'), 'CREATE TABLE public.unregistered(id int);')
    const { errors } = await auditMigrationGrants(directory)
    assert.ok(errors.some((error) => error.includes('runtime relation DDL')))
    assert.ok(errors.some((error) => error.includes('register schema SQL')))
  } finally { await rm(directory, { recursive: true, force: true }) }
})
test('generator stops on inherited access and non-owner grantors', () => {
  assert.throws(() => generateGrants({ roles: [{ role: 'anon', inherited: ['custom'] }] }), /inherited/)
  assert.throws(() => generateGrants({ roles, relation_acl: [
    { grantee: 'anon', owner: 'postgres', grantor: 'custom', name: 'foo' },
  ] }), /grantor/)
})
test('comparison detects column, sequence and grant-option changes', () => {
  const before = { column_acl: [{ name: 'private', grantable: false }], relation_acl: [{ kind: 'S', privilege: 'USAGE' }] }
  const after = { column_acl: [{ name: 'private', grantable: true }] }
  assert.equal(compareSnapshots(before, after).length, 3)
  assert.deepEqual(compareSnapshots(before, before), [])
})
test('comparison detects default privilege changes', () => {
  const before = { defaults: [{ creator: 'postgres', privilege: 'INSERT', grantee: 'anon' }] }
  assert.equal(compareSnapshots(before, {}).length, 1)
  assert.deepEqual(compareSnapshots(before, before), [])
})

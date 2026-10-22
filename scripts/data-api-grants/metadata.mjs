import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

export const categories = ['objects', 'relation_acl', 'column_acl',
  'effective_relations', 'effective_columns', 'roles', 'schema_acl']
const identifier = (name) => `"${name.replaceAll('"', '""')}"`
const target = (name) => name === 'PUBLIC' ? name : identifier(name)
const apiRoles = new Set(['anon', 'authenticated', 'service_role', 'PUBLIC'])
const canonical = (value) => JSON.stringify(value, Object.keys(value).sort())

function unwrapSnapshot(result) {
  if (Array.isArray(result.rows)) return result.rows[0]?.snapshot
  if (Array.isArray(result)) return result[0]?.snapshot
  return result.snapshot ?? result
}

export async function readSnapshot(path) {
  const snapshot = unwrapSnapshot(JSON.parse(await readFile(path, 'utf8')))
  if (!snapshot || !Array.isArray(snapshot.objects)) throw new Error('Expected a catalog snapshot; no object inventory found')
  if (snapshot.roles?.length !== 3) throw new Error('Expected all three API roles in the snapshot')
  return snapshot
}

export function summarize(snapshot) {
  return Object.fromEntries(categories.map((category) => {
    const rows = (snapshot[category] ?? []).map(canonical).sort()
    return [category, { rows: rows.length,
      sha256: createHash('sha256').update(rows.join('\n')).digest('hex') }]
  }))
}

export function compareSnapshots(before, after) {
  return categories.flatMap((category) => {
    const left = new Set((before[category] ?? []).map(canonical))
    const right = new Set((after[category] ?? []).map(canonical))
    return [
      ...[...left].filter((row) => !right.has(row)).map((row) => ({ category, removed: JSON.parse(row) })),
      ...[...right].filter((row) => !left.has(row)).map((row) => ({ category, added: JSON.parse(row) })),
    ]
  })
}

function groupGrants(rows) {
  const grouped = new Map()
  for (const row of rows) {
    if (row.grantor !== row.owner) throw new Error(`Review non-owner grantor on ${row.name}`)
    const key = canonical({ schema: row.schema, name: row.name, kind: row.kind,
      grantee: row.grantee, grantable: row.grantable, column: row.column })
    const group = grouped.get(key) ?? { ...row, privileges: new Set() }
    group.privileges.add(row.privilege)
    grouped.set(key, group)
  }
  return [...grouped.values()]
}

function grantStatement(row) {
    const object = row.kind === 'S' ? 'sequence' : 'table'
    const privileges = [...row.privileges].sort().map((privilege) =>
      row.column ? `${privilege} (${identifier(row.column)})` : privilege).join(', ')
    const option = row.grantable ? ' with grant option' : ''
  return `grant ${privileges} on ${object} ${identifier(row.schema)}.${identifier(row.name)} to ${target(row.grantee)}${option};`
}

export function generateGrants(snapshot) {
  for (const role of snapshot.roles) {
    if (role.inherited.length) throw new Error(`Review inherited privileges for ${role.role} before generating grants`)
  }
  const rows = [...(snapshot.relation_acl ?? []), ...(snapshot.column_acl ?? [])]
    .filter((row) => apiRoles.has(row.grantee))
  const statements = groupGrants(rows).map(grantStatement)
  if (!statements.length) throw new Error('No API grants found; review the snapshot before creating a baseline')
  return [...new Set(statements)].sort().join('\n') + '\n'
}

import assert from 'node:assert/strict'
import { tokenize } from './migration-grants.mjs'

export const grantStart = '-- BEGIN explicit Data API grants'
export const grantEnd = '-- END explicit Data API grants'
const hasMarker = (sql) => sql.includes(grantStart) || sql.includes(grantEnd)

function blockBounds(sql) {
  assert.equal(sql.split(grantStart).length, 2, 'Expected exactly one grant start marker')
  assert.equal(sql.split(grantEnd).length, 2, 'Expected exactly one grant end marker')
  const start = sql.indexOf(grantStart)
  const end = sql.indexOf(grantEnd) + grantEnd.length
  assert.ok(start < end - grantEnd.length, 'Grant markers must be in order')
  return { start, end }
}

export function wrapGrantArtifact(artifact) {
  return `${grantStart}\n${artifact.trim()}\n${grantEnd}`
}

export function schemaReplay(sources) {
  assert.ok(sources.length, 'Register at least one schema file')
  let block
  const replay = sources.map((sql) => {
    if (!hasMarker(sql)) return sql
    assert.equal(block, undefined, 'Expected exactly one generated grant block across schema files')
    const { start, end } = blockBounds(sql)
    block = sql.slice(start, end)
    return sql.slice(0, start) + sql.slice(end)
  })
  assert.ok(block, 'Expected the generated schema grants block')
  return { sql: replay.join('\n\n'), block }
}

export function assertGrantArtifact(sources, artifact) {
  const tokens = tokenize(artifact)
  const wrappers = tokens.filter((token) => token.type === 'word' && ['begin', 'commit'].includes(token.value))
  assert.deepEqual(wrappers.map((token) => token.value), ['begin', 'commit'], 'Artifact requires one transaction wrapper')
  assert.equal(tokens[0]?.value, 'begin', 'Artifact must start its transaction before statements')
  assert.equal(tokens.at(-2)?.value, 'commit', 'Artifact must commit after all statements')
  assert.equal(schemaReplay(sources).block, wrapGrantArtifact(artifact),
    'The complete grant block, including markers and transaction wrapper, must match the artifact')
}

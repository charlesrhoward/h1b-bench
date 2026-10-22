import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { summarize } from './metadata.mjs'

export const proofUsage = `Usage: node scripts/test-data-api-grants.mjs [--snapshot-dir DIR]
Requires Supabase CLI, Docker, and free local ports 56320–56322.
Uses only its unique disposable project. Optional private snapshots are saved
in a unique directory under DIR for exact comparisons and failure diagnosis.
`

export function parseProofArguments(args) {
  const { values } = parseArgs({ args, options: {
    help: { type: 'boolean', short: 'h' },
    'snapshot-dir': { type: 'string' },
  } })
  return { help: values.help, snapshotDirectory: values['snapshot-dir'] }
}

export function proofDirectory(directory, scratch) {
  if (!directory) return scratch
  const path = resolve(directory)
  mkdirSync(path, { recursive: true, mode: 0o700 })
  return mkdtempSync(join(path, 'proof-'))
}

export function writeProofSnapshot(directory, name, snapshot) {
  const path = join(directory, `${name}.json`)
  writeFileSync(path, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600 })
  return path
}

export function assertSnapshotContract(snapshot, expected, path) {
  const actual = summarize(snapshot)
  const changed = Object.keys(expected).filter((category) => !isDeepStrictEqual(actual[category], expected[category]))
  if (!changed.length) return
  throw new Error(`Permission contract mismatch: ${changed.join(', ')}.\n`
    + `Actual rows: ${path}\n`
    + 'Compare with reviewed production rows: node scripts/data-api-grants/inspect.mjs compare PRODUCTION_SNAPSHOT ACTUAL_SNAPSHOT\n'
    + 'See scripts/data-api-grants/README.md before updating expected-summary.json.')
}

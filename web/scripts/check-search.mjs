import assert from "node:assert/strict";

// Live check of the search_employers RPC (etl/schema.sql, migration search_employers_short_terms).
// Before that migration, 1-2 letter terms and `%` or `_` scanned every employer name and passed
// the 3 s anon statement timeout. Run this after any change to the function. It reads the
// database in NEXT_PUBLIC_SUPABASE_URL with the publishable key, so expected names are real rows.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (web/.env.local).");

// Round trip from a laptop. The database time for these terms is 1-60 ms.
const BUDGET_MS = 1_000;

async function search(q, lim) {
  const started = performance.now();
  const response = await fetch(new URL("/rest/v1/rpc/search_employers", url), {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, lim }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.text();
  const elapsed = performance.now() - started;
  assert.equal(response.status, 200, `${JSON.stringify(q)}: ${body}`);
  assert.ok(elapsed < BUDGET_MS, `${JSON.stringify(q)} took ${Math.round(elapsed)} ms (budget ${BUDGET_MS} ms)`);
  return JSON.parse(body);
}

/** Rows come back by all-time filings, most first; equal filings break by id, lowest first. */
function assertFilingsThenId(q, hits) {
  for (let i = 1; i < hits.length; i++) {
    const [a, b] = [hits[i - 1], hits[i]];
    const ordered = a.filings > b.filings || (a.filings === b.filings && a.id < b.id);
    assert.ok(ordered, `${JSON.stringify(q)}: ${a.name} (${a.filings}) before ${b.name} (${b.filings})`);
  }
}

/** A 1-2 letter term (wildcards included) matches the start of the name as literal text. */
async function checkShortTerm(q, firstName) {
  const hits = await search(q, 100);
  for (const hit of hits) assert.ok(hit.name.toLowerCase().startsWith(q), `${JSON.stringify(q)}: ${hit.name}`);
  assertFilingsThenId(q, hits);
  if (firstName) assert.equal(hits[0]?.name, firstName, `${JSON.stringify(q)}: wrong first hit`);
  return hits.length;
}

const counts = {
  in: await checkShortTerm("in", "INFOSYS LIMITED"),
  go: await checkShortTerm("go", "Google LLC"),
  "%": await checkShortTerm("%"),
  _: await checkShortTerm("_"),
  "\\": await checkShortTerm("\\"),
  "a%": await checkShortTerm("a%"),
};
assert.equal(counts.in, 100, "\"in\" must fill the limit");

// 3+ letters keep the fuzzy match, with the name prefix first.
const long = await search("infosys", 8);
assert.equal(long[0]?.name, "INFOSYS LIMITED");
assert.equal(new Set(long.map((hit) => hit.id)).size, long.length, "duplicate ids");

process.stdout.write(`search_employers checks passed: ${JSON.stringify(counts)}\n`);

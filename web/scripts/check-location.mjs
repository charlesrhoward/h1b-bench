import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Resolve the app's @/lib TypeScript imports before loading the real JSON-LD builder.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = specifier.startsWith("@/lib/")
      ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier;
    return nextResolve(source, context);
  },
});
const [{ displayLocationFields, fmtLocation }, { employerJsonLd }] = await Promise.all([
  import("../src/lib/format.ts"),
  import("../src/lib/json-ld.ts"),
]);

// Real source mismatch: independently aggregated fields must not publish "McLean, INDIA".
const cases = [
  [{ city: "McLean", state: null, country: "INDIA" }, "McLean"],
  [{ city: "Redmond", state: "WA", country: "INDIA" }, "Redmond, WA"],
  [{ city: "Bengaluru", state: "KA", country: "INDIA" }, "Bengaluru, KA"],
  [{ city: " Toronto ", state: " ON ", country: " CANADA " }, "Toronto, ON"],
  [{ city: "Redmond", state: null, country: "US" }, "Redmond"],
  [{ city: null, state: " WA ", country: "INDIA" }, "WA"],
  [{ city: "Redmond", state: "WA", country: null }, "Redmond, WA"],
  [{ city: null, state: null, country: " INDIA " }, "INDIA"],
  [{ city: " ", state: " ", country: " CANADA " }, "CANADA"],
  [{ city: null, state: null, country: "United States" }, "United States"],
  [{ city: null, state: null, country: null }, ""],
  [{ city: " ", state: " ", country: " " }, ""],
];

for (const [address, expected] of cases) {
  assert.equal(fmtLocation(address), expected, JSON.stringify(address));
}

const usNames = ["UNITED STATES OF AMERICA", "United States", "USA", "US", "U.S.", "U.S.A.", "United States (USA)"];
for (const country of usNames) {
  assert.equal(fmtLocation({ city: "Redmond", state: "WA", country }), "Redmond, WA", country);
  assert.equal(fmtLocation({ city: null, state: null, country }), "United States", country);
}

// Structured metadata must omit the contradictory country, not just hide it in the label.
assert.deepEqual(displayLocationFields({ city: "McLean", state: null, country: "INDIA" }), {
  city: "McLean", state: undefined, country: undefined,
});
assert.deepEqual(displayLocationFields({ city: null, state: " ", country: " INDIA " }), {
  city: undefined, state: undefined, country: "INDIA",
});

// Check the serialized shape that JsonLd sends to crawlers: absent keys, not null values.
function structuredAddress(fields) {
  const node = employerJsonLd({ id: 52180, name: "Ecraft Solutions Inc", ...fields }, "/employers/ecraft-solutions-inc-52180");
  const serialized = JSON.parse(JSON.stringify(node));
  return serialized["@graph"][0].mainEntity.address;
}
assert.deepEqual(structuredAddress({ city: "McLean", state: null, country: "INDIA" }), {
  "@type": "PostalAddress", addressLocality: "McLean",
});
for (const country of usNames) {
  assert.deepEqual(structuredAddress({ city: "Redmond", state: "WA", country }), {
    "@type": "PostalAddress", addressLocality: "Redmond", addressRegion: "WA",
  });
}
assert.deepEqual(structuredAddress({ city: null, state: null, country: "USA" }), {
  "@type": "PostalAddress", addressCountry: "United States",
});

process.stdout.write("Location display and serialized JSON-LD checks passed.\n");

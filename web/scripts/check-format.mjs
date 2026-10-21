import assert from "node:assert/strict";
import { displayLocationFields, fmtLocation } from "../src/lib/format.ts";

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
}

// Structured metadata must omit the contradictory country, not just hide it in the label.
assert.deepEqual(displayLocationFields({ city: "McLean", state: null, country: "INDIA" }), {
  city: "McLean", state: undefined, country: undefined,
});
assert.deepEqual(displayLocationFields({ city: null, state: " ", country: " INDIA " }), {
  city: undefined, state: undefined, country: "INDIA",
});

process.stdout.write(`Location display checks passed (${cases.length + usNames.length + 2} cases).\n`);

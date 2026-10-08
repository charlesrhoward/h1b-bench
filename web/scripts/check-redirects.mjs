import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { get as getHttp } from "node:http";
import { get as getHttps } from "node:https";

const base = new URL(process.env.BENCH_BASE_URL ?? "http://localhost:3100");

function readResponse(path) {
  const url = new URL(path, base);
  const get = url.protocol === "https:" ? getHttps : getHttp;
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      response.resume();
      response.on("end", () => resolve(response));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.setTimeout(30_000, () => request.destroy(new Error("Request timed out")));
  });
}

function checkRedirect(response) {
  assert.equal(response.statusCode, 308);
  const locations = response.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === "location");
  assert.equal(locations.length, 1, "ISR must emit exactly one Location header");
  assert.match(response.headers.location, /^\/employers\/[^,]+-1$/);
  return response.headers.location;
}

// A unique alias exercises the uncached ISR path on every run.
const alias = `/employers/performance-check-${randomUUID()}-1`;
const destination = checkRedirect(await readResponse(alias));
assert.equal(checkRedirect(await readResponse(alias)), destination);
assert.equal((await readResponse(destination)).statusCode, 200);
const warm = await readResponse(destination);
assert.equal(warm.statusCode, 200);
assert.equal(warm.headers["x-nextjs-cache"], "HIT");
process.stdout.write(`Cold and cached redirects passed: ${destination}\n`);

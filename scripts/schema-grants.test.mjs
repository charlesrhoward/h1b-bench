import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
test('fresh-schema grants equal the reviewed production artifact', async () => {
  const config = JSON.parse(await readFile(resolve(root, 'scripts/migration-grants.config.json'), 'utf8'));
  const schema = await readFile(resolve(root, 'etl/schema.sql'), 'utf8');
  const artifact = await readFile(resolve(root, config.baselineFile), 'utf8');
  const block = schema.split('-- BEGIN explicit Data API grants')[1]?.split('-- END explicit Data API grants')[0];
  assert.ok(block, 'Expected the generated schema grants block');
  const grants = (text) => text.split('\n').filter((line) => line.startsWith('grant '));
  assert.deepEqual(grants(block), grants(artifact));
});

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath,
  [join(root, 'web/node_modules/eslint/bin/eslint.js'), ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit' });
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exitCode = result.status ?? 1;

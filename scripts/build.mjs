/**
 * Build cross-platform: evita `&&` nelle npm scripts,
 * che non funziona con shell PowerShell.
 */
import { spawnSync } from 'node:child_process';

const steps = [
  ['node_modules/typescript/bin/tsc', ['--noEmit']],
  ['node_modules/vite/bin/vite.js', ['build']],
];

for (const [script, args] of steps) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLEAN_TARGETS = [
  'dist',
  '.runtime/dev-sites',
  'node_modules/.cache',
  'node_modules/.vite',
  'apps/sdkwork-webserver-pc/dist',
  'apps/sdkwork-webserver-pc/node_modules/.cache',
  'apps/sdkwork-webserver-pc/node_modules/.vite',
];

function resolveOwnedTarget(relativePath) {
  const absolutePath = path.resolve(REPO_ROOT, relativePath);
  if (!absolutePath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error(`clean target escapes the repository: ${relativePath}`);
  }
  return absolutePath;
}

function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  for (const relativePath of CLEAN_TARGETS) {
    console.log(`[sdkwork-clean] ${dryRun ? 'would remove' : 'removing'} ${relativePath}`);
    if (!dryRun) rmSync(resolveOwnedTarget(relativePath), { force: true, recursive: true });
  }
  console.log(`[sdkwork-clean] ${dryRun ? 'would run' : 'running'} cargo clean`);
  if (dryRun) return;
  const command = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
  const result = spawnSync(command, ['clean'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`cargo clean exited with code ${result.status}`);
}

try {
  main();
} catch (error) {
  console.error(`[sdkwork-clean] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

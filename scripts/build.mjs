#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  ensureTrackedBuildSources,
  listTrackedCargoBuildSources,
} from './lib/build-source-integrity.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const settings = {
    binary: undefined,
    check: false,
    dryRun: false,
    packageName: undefined,
    release: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--bin') {
      settings.binary = argv[++index];
    } else if (argument === '--check') {
      settings.check = true;
    } else if (argument === '--dry-run') {
      settings.dryRun = true;
    } else if (argument === '--package') {
      settings.packageName = argv[++index];
    } else if (argument === '--release') {
      settings.release = true;
    } else if (argument === '--help' || argument === '-h') {
      settings.help = true;
    } else {
      throw new Error(`unsupported option: ${argument}`);
    }
  }
  if (settings.binary && !settings.packageName) {
    throw new Error('--bin requires --package');
  }
  return settings;
}

function printHelp() {
  console.log('Usage: node scripts/build.mjs [--check] [--release] [--package <name>] [--bin <name>] [--dry-run]');
}

function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const buildSources = listTrackedCargoBuildSources({ repoRoot: REPO_ROOT });
  ensureTrackedBuildSources({ repoRoot: REPO_ROOT, relativePaths: buildSources });

  const args = [settings.check ? 'check' : 'build'];
  if (!settings.packageName) args.push('--workspace');
  if (settings.packageName) args.push('--package', settings.packageName);
  if (settings.binary) args.push('--bin', settings.binary);
  if (settings.release && !settings.check) args.push('--release');
  const command = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
  console.log(`[sdkwork-build] command=${command} ${args.join(' ')}`);
  if (settings.dryRun) return;

  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`cargo exited with code ${result.status}`);
}

try {
  main();
} catch (error) {
  console.error(`[sdkwork-build] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureTrackedBuildSources } from '../../../scripts/lib/build-source-integrity.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(APP_ROOT, '../..');
const BUILD_SOURCES = [
  'apps/sdkwork-webserver-pc/package.json',
  'apps/sdkwork-webserver-pc/scripts/browser-topology.d.mts',
  'apps/sdkwork-webserver-pc/scripts/browser-topology.mjs',
  'apps/sdkwork-webserver-pc/tsconfig.json',
  'apps/sdkwork-webserver-pc/vite.config.ts',
  'apps/sdkwork-webserver-pc/src/main.tsx',
];

ensureTrackedBuildSources({ repoRoot: REPO_ROOT, relativePaths: BUILD_SOURCES });
console.log('[sdkwork-webserver-pc] build-critical sources verified');

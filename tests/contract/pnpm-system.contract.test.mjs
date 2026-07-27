import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ensureTrackedBuildSources } from '../../scripts/lib/build-source-integrity.mjs';
import { collectGenerationPlans } from '../../tools/generate_web_sdks.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

function runNode(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('root pnpm surface exposes every owned capability through canonical action-first names', () => {
  const scripts = readJson('package.json').scripts;
  for (const name of [
    'dev', 'dev:standalone', 'dev:cloud', 'stop', 'build', 'test', 'check', 'verify', 'clean',
    'api:materialize', 'api:materialize:check', 'api:check',
    'sdk:generate', 'sdk:generate:check', 'sdk:check',
    'db:postgres:plan', 'db:postgres:init', 'db:postgres:migrate',
    'gateway:run:standalone', 'gateway:plan:standalone', 'gateway:build:standalone',
    'gateway:package:standalone', 'gateway:validate:standalone', 'gateway:matrix',
    'release:plan:standalone', 'release:plan:cloud',
    'release:build:standalone', 'release:build:cloud',
    'release:package:standalone', 'release:package:cloud',
    'release:validate:standalone', 'release:validate:cloud',
    'deploy:validate', 'deploy:plan:standalone', 'deploy:plan:cloud',
    'deploy:apply:standalone', 'deploy:apply:cloud',
    'deploy:rollback:standalone', 'deploy:rollback:cloud',
    'topology:validate', 'topology:plan', 'sbom:generate', 'sbom:check',
  ]) {
    assert.equal(typeof scripts[name], 'string', `missing canonical root script ${name}`);
  }
  assert.equal(scripts.dev, 'pnpm dev:standalone');
  assert.equal(scripts['dev:standalone'], 'pnpm exec sdkwork-app dev --deployment-profile standalone');
  assert.equal(scripts['dev:cloud'], 'pnpm exec sdkwork-app dev --deployment-profile cloud');
  assert.equal(scripts['_sdkwork:build'], 'node scripts/build.mjs --release');
  assert.equal(scripts['_sdkwork:clean'], 'node scripts/clean.mjs');
  assert.equal(
    scripts['gateway:route-composition:audit'],
    'node ../sdkwork-specs/tools/audit-gateway-route-composition-workspace.mjs --workspace .. --prefix sdkwork-web-server',
  );
  assert.match(scripts['_sdkwork:check'], /pnpm api:check/u);
  assert.match(scripts['_sdkwork:check'], /pnpm sdk:check/u);
  assert.match(scripts['_sdkwork:check'], /pnpm deploy:validate/u);
});

test('SDK generation covers every materialized manifest language', () => {
  const plans = collectGenerationPlans();
  const expected = [
    'sdkwork-web-app-sdk',
    'sdkwork-web-backend-sdk',
    'sdkwork-web-internal-sdk',
  ].flatMap((familyName) => {
    const manifest = readJson(`sdks/${familyName}/sdk-manifest.json`);
    return manifest.languages
      .filter((language) => language.generationState === 'materialized')
      .map((language) => `${familyName}/${language.language}`);
  });
  assert.deepEqual(
    plans.map((plan) => `${plan.sdkName}/${plan.language}`),
    expected,
  );
  assert.equal(plans.length, 26);
});

test('PC app surface delegates dev and stop while keeping its local lifecycle scoped', () => {
  const appRoot = 'apps/sdkwork-webserver-pc';
  const parentDeployment = readJson('etc/sdkwork.deployment.config.json');
  const deployment = readJson(`${appRoot}/etc/sdkwork.deployment.config.json`);
  const cloudDevelopment = readJson(`${appRoot}/etc/browser/runtime-env.cloud.development.json`);
  const cloudProduction = readJson(`${appRoot}/etc/browser/runtime-env.production.json`);
  const scripts = readJson(`${appRoot}/package.json`).scripts;
  assert.equal(deployment.kind, 'sdkwork.component-deployment');
  assert.equal(deployment.parentDeploymentConfig, '../../../etc/sdkwork.deployment.config.json');
  assert.equal(deployment.parentTopologySpec, '../../../specs/topology.spec.json');
  assert.equal(
    cloudDevelopment.appbaseAppApiBaseUrl,
    parentDeployment.environments.development.cloudApiBaseUrl,
  );
  assert.equal(
    cloudProduction.appbaseAppApiBaseUrl,
    parentDeployment.environments.production.cloudApiBaseUrl,
  );
  assert.equal(scripts.dev, 'pnpm dev:standalone');
  assert.equal(
    scripts['dev:standalone'],
    'pnpm exec sdkwork-app dev --root ../.. --deployment-profile standalone',
  );
  assert.equal(
    scripts['dev:cloud'],
    'pnpm exec sdkwork-app dev --root ../.. --deployment-profile cloud',
  );
  assert.equal(scripts.stop, 'pnpm exec sdkwork-app stop --root ../..');
  assert.doesNotMatch(scripts.build, /sdkwork-app/u);
  assert.doesNotMatch(scripts.test, /sdkwork-app/u);
  assert.doesNotMatch(scripts.clean, /sdkwork-app/u);
});

test('parent topology starts the browser client in both development profiles only', () => {
  const topology = readJson('specs/topology.spec.json');
  const standalone = topology.orchestration.profiles['standalone.development'].processes;
  const cloud = topology.orchestration.profiles['cloud.development'].processes;
  const standaloneClient = standalone.find((entry) => entry.id === 'webserver-pc-browser');
  const cloudClient = cloud.find((entry) => entry.id === 'webserver-pc-browser');
  assert.deepEqual(standaloneClient.runtimeTargets, ['browser']);
  assert.deepEqual(cloudClient.runtimeTargets, ['browser']);
  assert.equal(standaloneClient.script, '_sdkwork:client:browser:standalone');
  assert.equal(cloudClient.script, '_sdkwork:client:browser:cloud');
  for (const profileId of ['standalone.production', 'cloud.production']) {
    assert.equal(
      topology.orchestration.profiles[profileId].processes.some(
        (entry) => entry.id === 'webserver-pc-browser',
      ),
      false,
    );
  }
});

test('build source integrity restores a missing tracked source before continuing', () => {
  let exists = false;
  const calls = [];
  ensureTrackedBuildSources({
    repoRoot: REPO_ROOT,
    relativePaths: ['tracked/Cargo.toml'],
    fileExists: () => exists,
    inspectFile: () => ({ isFile: () => true, isSymbolicLink: () => false }),
    runProcess(command, args) {
      calls.push([command, ...args]);
      if (args[0] === 'checkout') exists = true;
      return { status: 0, stdout: 'tracked/Cargo.toml\n', stderr: '' };
    },
  });
  assert.deepEqual(calls, [
    ['git', 'ls-files', '--error-unmatch', '--', 'tracked/Cargo.toml'],
    ['git', 'checkout', 'HEAD', '--', 'tracked/Cargo.toml'],
  ]);
});

test('clean dry-run enumerates only approved reproducible outputs', () => {
  const result = runNode(['scripts/clean.mjs', '--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  for (const target of [
    'dist', '.runtime/dev-sites', 'node_modules/.cache', 'node_modules/.vite',
    'apps/sdkwork-webserver-pc/dist',
  ]) {
    assert.match(result.stdout, new RegExp(`would remove ${target.replaceAll('.', '\\.')}`, 'u'));
  }
  assert.doesNotMatch(result.stdout, /public\/runtime-env\.json|etc\/|specs\/|database\//u);
  assert.match(result.stdout, /would run cargo clean/u);
});

test('materialization checks are deterministic and do not rewrite tracked output', () => {
  const apiCheck = runNode(['tools/materialize_web_phase1_contracts.mjs', '--check']);
  assert.equal(apiCheck.status, 0, apiCheck.stderr);
  const pcCheck = runNode(
    ['scripts/materialize-runtime-env.mjs', '--deployment-profile', 'cloud', '--environment', 'production', '--check'],
    path.join(REPO_ROOT, 'apps', 'sdkwork-webserver-pc'),
  );
  assert.equal(pcCheck.status, 0, pcCheck.stderr);
});

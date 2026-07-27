import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

test('credential entry uses the PC manifest identity in every client profile', () => {
  const rootManifest = readJson('sdkwork.app.config.json');
  const pcManifest = readJson('apps/sdkwork-webserver-pc/sdkwork.app.config.json');
  const topology = readJson('specs/topology.spec.json');

  assert.equal(rootManifest.backend.appId, 'sdkwork-web');
  assert.equal(rootManifest.backend.tenantId, '100001');
  assert.equal(rootManifest.backend.organizationId, '0');
  assert.equal(pcManifest.backend.appId, 'sdkwork-webserver-pc');
  assert.equal(pcManifest.backend.tenantId, '100001');
  assert.equal(pcManifest.backend.organizationId, '0');

  for (const profileId of ['standalone.development', 'cloud.development']) {
    const client = topology.orchestration.profiles[profileId].processes.find(
      (entry) => entry.id === 'webserver-pc-browser',
    );
    assert.equal(client.applicationRoot, 'apps/sdkwork-webserver-pc');
  }
});

test('standalone startup provisions tenant applications before API assembly', () => {
  const bootstrap = read(
    'crates/sdkwork-api-web-server-standalone-gateway/src/iam_application_bootstrap.rs',
  );
  const gatewayBootstrap = read(
    'crates/sdkwork-api-web-server-standalone-gateway/src/bootstrap.rs',
  );
  const gatewayCargo = read('crates/sdkwork-api-web-server-standalone-gateway/Cargo.toml');
  const workspaceCargo = read('Cargo.toml');

  assert.match(
    bootstrap,
    /ensure_tenant_application_from_app_root_with_env_and_fallback/u,
  );
  assert.match(bootstrap, /bootstrap_iam_database_from_env/u);
  assert.match(gatewayCargo, /sdkwork-iam-embedded-application-bootstrap/u);
  assert.match(gatewayCargo, /sdkwork-iam-database-host/u);
  assert.match(workspaceCargo, /sdkwork-iam-embedded-application-bootstrap/u);
  assert.match(workspaceCargo, /sdkwork-iam-database-host/u);
  assert.ok(
    gatewayBootstrap.indexOf('ensure_web_tenant_application_bootstrap().await?')
      < gatewayBootstrap.indexOf('assemble_api_router().await?'),
    'tenant application bootstrap must finish before the Web API assembly is built',
  );
});

test('standalone runner injects shared IAM roots and keeps real auth enabled', () => {
  const topologyHelper = read('scripts/lib/webserver-topology.mjs');
  const devRunner = read('scripts/webserver-dev.mjs');
  const topology = readJson('specs/topology.spec.json');
  const gateway = topology.orchestration.profiles['standalone.development'].processes.find(
    (entry) => entry.id === 'application.public-ingress',
  );

  assert.equal(gateway.script, '_sdkwork:gateway:standalone');
  assert.match(topologyHelper, /SDKWORK_APP_ROOT:\s*REPO_ROOT/u);
  assert.match(topologyHelper, /SDKWORK_IAM_APP_ROOT:\s*IAM_REPO_ROOT/u);
  assert.match(devRunner, /resolveIamDevEnv/u);
  assert.match(devRunner, /IAM_APPLICATION_BOOTSTRAP_ENV/u);
  assert.doesNotMatch(devRunner, /SDKWORK_WEB_DEV_AUTH_BYPASS/u);
});

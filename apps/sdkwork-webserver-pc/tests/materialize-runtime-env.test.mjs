import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveSource,
  validateRuntimeSource,
} from '../scripts/materialize-runtime-env.mjs';

const appRoot = path.resolve(import.meta.dirname, '..');

describe('browser runtime materialization', () => {
  it.each([
    ['development', 'standalone.development'],
    ['production', 'standalone.production'],
  ])('keeps standalone %s public SDK roots browser-relative', (environment, profileId) => {
    const { value } = resolveSource('standalone', environment);

    expect(value).toMatchObject({
      appApiBaseUrl: '/',
      appbaseAppApiBaseUrl: '/',
      backendApiBaseUrl: '/',
      browserOriginMode: 'same-origin',
      driveAppApiBaseUrl: '/',
      messagingPcUrl: environment === 'development'
        ? 'http://127.0.0.1:5184/notifications'
        : 'https://messaging.sdkwork.com/notifications',
      profileId,
      runtimeTarget: 'browser',
    });
    expect(JSON.stringify({ ...value, deployAppApiBaseUrl: undefined })).not.toMatch(/:(?:3800|3900)\b/u);
  });

  it('rejects an absolute listener URL in standalone public runtime source', () => {
    const value = resolveSource('standalone', 'development').value;
    expect(() => validateRuntimeSource({
      ...value,
      appbaseAppApiBaseUrl: 'http://127.0.0.1:49111',
    }, {
      deploymentProfile: 'standalone',
      environment: 'development',
    })).toThrow(/canonical same-origin root/);
  });

  it('keeps the materialized public document free of internal listener ports', () => {
    const source = readFileSync(path.join(appRoot, 'public', 'runtime-env.json'), 'utf8');
    // deployAppApiBaseUrl points at the SDKWork Deployments control plane and
    // is the only explicit cross-service URL allowed in standalone sources.
    expect(source.replace(/"deployAppApiBaseUrl": "[^"]*"/g, '')).not.toMatch(/:(?:3800|3900)\b/u);
  });

  it('rejects a production notification center loopback URL', () => {
    const value = resolveSource('standalone', 'production').value;
    expect(() => validateRuntimeSource({
      ...value,
      messagingPcUrl: 'http://127.0.0.1:5184/notifications',
    }, {
      deploymentProfile: 'standalone',
      environment: 'production',
    })).toThrow(/cannot use a loopback host/);
  });
});

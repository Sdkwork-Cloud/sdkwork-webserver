import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_API_PROXY_PATHS,
  createCanonicalApiProxyConfig,
  resolveBrowserDevelopmentServer,
} from '../scripts/browser-topology.mjs';

const appRoot = path.resolve(import.meta.dirname, '..');

describe('Vite browser topology', () => {
  it('derives the renderer bind and standalone proxy target from the parent profile', () => {
    const browserPort = 54321;
    const ingressPort = 54322;
    const developmentServer = resolveBrowserDevelopmentServer({
      appRoot,
      deploymentProfile: 'standalone',
      environment: 'development',
      processEnv: {},
      readText(file) {
        const source = readFileSync(file, 'utf8');
        if (!file.endsWith('standalone.development.env')) return source;
        return source
          .replace(/^SDKWORK_WEBSERVER_PC_DEV_BIND=.*$/mu, `SDKWORK_WEBSERVER_PC_DEV_BIND=127.0.0.1:${browserPort}`)
          .replace(/^SDKWORK_WEBSERVER_APPLICATION_PUBLIC_HTTP_URL=.*$/mu, `SDKWORK_WEBSERVER_APPLICATION_PUBLIC_HTTP_URL=http://127.0.0.1:${ingressPort}`);
      },
    });

    expect(developmentServer).toMatchObject({
      host: '127.0.0.1',
      port: browserPort,
      profileId: 'standalone.development',
      proxyTarget: `http://127.0.0.1:${ingressPort}`,
    });
  });

  it('proxies only canonical paths without rewriting client-visible URIs', () => {
    const proxy = createCanonicalApiProxyConfig('http://127.0.0.1:49111');

    expect(CANONICAL_API_PROXY_PATHS).toEqual([
      '/app/v3/api',
      '/backend/v3/api',
      '/openapi.json',
      '/healthz',
      '/readyz',
      '/livez',
      '/metrics',
    ]);
    expect(Object.keys(proxy)).toEqual(CANONICAL_API_PROXY_PATHS);
    for (const options of Object.values(proxy)) {
      expect(options.target).toBe('http://127.0.0.1:49111');
      expect(options).not.toHaveProperty('rewrite');
    }
  });

  it('rejects standalone development without canonical same-origin delivery evidence', () => {
    expect(() => resolveBrowserDevelopmentServer({
      appRoot,
      deploymentProfile: 'standalone',
      environment: 'development',
      processEnv: {},
      readText(file) {
        const source = readFileSync(file, 'utf8');
        if (!file.endsWith('topology.spec.json')) return source;
        const topology = JSON.parse(source);
        topology.orchestration.profiles['standalone.development']
          .browserDeliveries[0].preserveCanonicalPaths = false;
        return JSON.stringify(topology);
      },
    })).toThrow(/canonical-path same-origin dev-server proxy/u);
  });

  it('keeps React workspace deduplication enabled', () => {
    const viteConfig = readFileSync(path.join(appRoot, 'vite.config.ts'), 'utf8');
    expect(viteConfig).toMatch(/dedupe:\s*\["react",\s*"react-dom",\s*"react-router",\s*"react-router-dom"\]/u);
  });
});

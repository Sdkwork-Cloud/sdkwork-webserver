# SDKWork Webserver PC Application

Read `../../../sdkwork-specs/SOUL.md` first. The canonical PC, React, SDK, backend UI, config, naming, TypeScript, frontend, pagination, security, and test standards remain authoritative.

This root owns the browser host only. `packages/*-console-*` may consume the Web App SDK through console-core. `packages/*-admin-*` may consume the Web Backend SDK through admin-core. Never use raw HTTP, local SDK forks, manual authorization headers, or cross-surface business imports.

Runtime values are sourced from `etc/browser/*.json` and materialized to `public/runtime-env.json`. `sdkwork.app.config.json` declares application identity and capability metadata only.


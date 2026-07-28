# @sdkwork/webserver-pc-documentation

Domain: infrastructure  
Capability: documentation  
Package type: React frontend feature  
Status: active

## Public API

The package exports `WebserverDocumentation`, `webserverDocumentationRoute`, package-local i18n messages, and the public navigation/viewer contracts from its package root.

## Required SDK Surface

No SDK is consumed. The application root injects Portal, Console, and notification-center navigation plus the supported agent names.

## Configuration

The host supplies locale and navigation values. The package does not read runtime configuration directly.

## Deployment Profile And Runtime Target Behavior

The public documentation route renders in both standalone and cloud browser profiles. It describes product behavior without owning build, deployment, or runtime configuration.

## Security

The route is public. It does not read credentials or call protected APIs. An optional viewer label is display-only and comes from the application auth runtime.

## Extension Points

Add content through package-owned components and locale fragments. Keep normative SDKWork rules linked to root specs rather than copying standard bodies into product documentation.

## Verification

```text
pnpm --dir apps/sdkwork-webserver-pc typecheck
pnpm --dir apps/sdkwork-webserver-pc test
pnpm --dir apps/sdkwork-webserver-pc build
```

Owner: SDKWork Web Server

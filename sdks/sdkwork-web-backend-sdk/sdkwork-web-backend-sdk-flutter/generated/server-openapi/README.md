# sdkwork-web-backend-sdk (Flutter)

Generated SDKWork v3 dual-token transport SDK.

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  sdkwork_web_backend_sdk: ^1.0.0
```

## Quick Start

```dart
import 'package:sdkwork_web_backend_sdk/sdkwork_web_backend_sdk.dart';

final client = SdkworkBackendClient.withBaseUrl(baseUrl: 'http://localhost:3800');
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
final result = await client.nginx.statusRetrieve();
print(result);
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```dart
final client = SdkworkBackendClient.withBaseUrl(baseUrl: 'http://localhost:3800');

// Set custom headers
client.setHeader('X-Custom-Header', 'value');
```

## API Modules

- `client.application` - application API
- `client.applicationDomain` - application_domain API
- `client.domain` - domain API
- `client.applicationSourceVersion` - application_source_version API
- `client.applicationDeployment` - application_deployment API
- `client.certificate` - certificate API
- `client.certificateDistribution` - certificate_distribution API
- `client.nginx` - nginx API
- `client.server` - server API
- `client.agent` - agent API
- `client.audit` - audit API

## Usage Examples

### application
```dart
// List managed applications
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
  'applicationType': 'WEB',
  'siteType': 4,
  'status': 5,
  'keyword': 'keyword',
};
final result = await client.application.applicationsList(params);
print(result);
```

### application_domain
```dart
// List application domains
final applicationId = '1';
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
};
final result = await client.applicationDomain.applicationsDomainsList(applicationId, params);
print(result);
```

### domain
```dart
// List tenant custom domain assets
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
};
final result = await client.domain.domainsList(params);
print(result);
```

### application_source_version
```dart
// List immutable application source versions
final applicationId = '1';
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
};
final result = await client.applicationSourceVersion.applicationsSourceVersionsList(applicationId, params);
print(result);
```

### application_deployment
```dart
// List application deployments
final applicationId = '1';
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
  'status': 3,
};
final result = await client.applicationDeployment.applicationsDeploymentsList(applicationId, params);
print(result);
```

### certificate
```dart
// List canonical certificates
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
};
final result = await client.certificate.certificatesList(params);
print(result);
```

### certificate_distribution
```dart
// List certificate manifest convergence by server
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
};
final result = await client.certificateDistribution.certificatesDistributionList(params);
print(result);
```

### nginx
```dart
// Retrieve Nginx status
final result = await client.nginx.statusRetrieve();
print(result);
```

### server
```dart
// List managed servers
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
};
final result = await client.server.serversList(params);
print(result);
```

### agent
```dart
// Retrieve the Nginx configuration and certificate bundle
final params = <String, dynamic>{
  'ifSyncVersion': 'ifsyncversion',
};
final result = await client.agent.retrieve(params);
print(result);
```

### audit
```dart
// List audit logs
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
  'targetType': 'targettype',
  'action': 'action',
  'operatorId': '1',
  'startDate': '2026-04-10T00:00:00Z',
  'endDate': '2026-04-10T00:00:00Z',
};
final result = await client.audit.logsList(params);
print(result);
```

## Error Handling

```dart
try {
  final result = await client.nginx.statusRetrieve();
  print(result);
} catch (e) {
  print('Error: $e');
}
```

## Publishing

This SDK includes cross-platform publish scripts in `bin/`:
- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

### Check

```bash
./bin/publish.sh --action check
```

### Publish

```bash
./bin/publish.sh --action publish --channel release
```

```powershell
.\bin\publish.ps1 --action publish --channel test --dry-run
```

> Ensure `dart pub publish --dry-run` passes before release publish.

## License

MIT

## Regeneration Contract

- HTTP/OpenAPI generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- HTTP/OpenAPI generation also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- HTTP/OpenAPI apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put HTTP/OpenAPI hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across HTTP/OpenAPI regenerations.
- If an HTTP/OpenAPI generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
- RPC SDK source workspaces use convention-first evidence by default: RPC SDK family naming, language workspace naming, `rpc/*.manifest.json`, proto source references, generated client source, and native package manifests.
- Use `sdkgen inspect --protocol rpc` to verify RPC convention evidence. Request persisted generator evidence only with `--emit-control-plane` for release, CI, audit, or migration workflows; evidence paths are derived by generator convention.

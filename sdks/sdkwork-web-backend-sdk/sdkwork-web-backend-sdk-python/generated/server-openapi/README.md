# sdkwork-web-backend-sdk (Python)

Generated SDKWork v3 dual-token transport SDK.

## Installation

```bash
pip install sdkwork-web-backend-sdk
```

## Quick Start

```python
from sdkwork_web_backend_sdk import SdkworkBackendClient, SdkConfig

config = SdkConfig(
    base_url="http://localhost:3800",
)

client = SdkworkBackendClient(config)
client.set_auth_token("your-auth-token")
client.set_access_token("your-access-token")

# Use the SDK
result = client.nginx.status.retrieve()
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```python
from sdkwork_web_backend_sdk import SdkworkBackendClient, SdkConfig

config = SdkConfig(
    base_url="http://localhost:3800",
)

client = SdkworkBackendClient(config)
client.set_header('X-Custom-Header', 'value')
```

## API Modules

- `client.application` - application API
- `client.application_domain` - application_domain API
- `client.application_source_version` - application_source_version API
- `client.application_deployment` - application_deployment API
- `client.certificate` - certificate API
- `client.certificate_distribution` - certificate_distribution API
- `client.nginx` - nginx API
- `client.server` - server API
- `client.agent` - agent API
- `client.audit` - audit API

## Usage Examples

### application

```python
# List managed applications
params = {
    'page': 1,
    'page_size': 2,
    'applicationType': 'WEB',
    'siteType': 4,
    'status': 5,
    'keyword': 'keyword',
}
result = client.application.list(params)
print(result)
```

### application_domain

```python
# List application domains
application_id = '1'
params = {
    'page': 1,
    'page_size': 2,
}
result = client.application_domain.applications.domains.list(application_id, params)
print(result)
```

### application_source_version

```python
# List immutable application source versions
application_id = '1'
params = {
    'page': 1,
    'page_size': 2,
}
result = client.application_source_version.applications.source_versions.list(application_id, params)
print(result)
```

### application_deployment

```python
# List application deployments
application_id = '1'
params = {
    'page': 1,
    'page_size': 2,
    'status': 3,
}
result = client.application_deployment.applications.deployments.list(application_id, params)
print(result)
```

### certificate

```python
# List canonical certificates
params = {
    'page': 1,
    'page_size': 2,
}
result = client.certificate.list(params)
print(result)
```

### certificate_distribution

```python
# List certificate manifest convergence by server
params = {
    'page': 1,
    'page_size': 2,
}
result = client.certificate_distribution.certificates.distribution.list(params)
print(result)
```

### nginx

```python
# Retrieve Nginx status
result = client.nginx.status.retrieve()
print(result)
```

### server

```python
# List managed servers
params = {
    'page': 1,
    'page_size': 2,
}
result = client.server.list(params)
print(result)
```

### agent

```python
# Retrieve the Nginx configuration and certificate bundle
params = {
    'ifSyncVersion': 'ifSyncVersion',
}
result = client.agent.sync.list(params)
print(result)
```

### audit

```python
# List audit logs
params = {
    'page': 1,
    'page_size': 2,
    'targetType': 'targetType',
    'action': 'action',
    'operatorId': 'operatorId',
    'startDate': 'startDate',
    'endDate': 'endDate',
}
result = client.audit.audit_logs.list(params)
print(result)
```

## Error Handling

```python
try:
    client.nginx.status.retrieve()
except Exception as error:
    print(f"Error: {error}")
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

> Configure Python package registry credentials before release publish.

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

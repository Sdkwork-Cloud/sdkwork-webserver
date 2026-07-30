# ADR-20260730 Root Domain Zones And Hostname Deployments

Status: accepted
Requirement: REQ-2026-0068
Owner: sdkwork-web-server
Date: 2026-07-30
Specs: DATABASE_SPEC.md, API_SPEC.md, PAGINATION_SPEC.md, WEB_BACKEND_SPEC.md, SDK_SPEC.md, BACKEND_UI_SPEC.md

## Context

`web_domain` stores fully qualified hostnames as a flat tenant inventory. That model cannot provide
a correctly paginated root-domain list or a stable root-domain detail page without loading all
hostnames into browser memory and guessing public suffixes.

## Decision

- Add `web_root_domain` as the tenant-owned root-domain Zone authority.
- Add nullable `web_domain.root_domain_id` so existing flat domain APIs remain compatible.
- Create apex and subdomain hostnames only through a selected root domain in the new workflow.
- Keep application binding on `web_domain.site_id` and derive the latest deployment from
  `web_deployment`; do not persist a duplicate domain-deployment relation.
- Page root domains and Zone hostnames independently at the repository boundary.
- Delete a root domain only when it has no live hostname children.
- Keep DNS-provider record management out of scope until a provider contract owns propagation.

## Alternatives

- Derive root domains from flat hostnames with a public-suffix library. Rejected because the
  control plane needs an explicit tenant-owned Zone lifecycle and existing rows cannot be assigned
  safely without operator intent.
- Copy the latest deployment onto every hostname row. Rejected because deployment state already
  belongs to `web_deployment`; copying it would introduce reconciliation and stale-state failures.
- Replace the existing flat domain API. Rejected because certificates, runtime compilation, and
  existing consumers still depend on stable domain identifiers and operations.

## Consequences

The backend-admin UI can use stable nested routes and bounded lists. Existing domain identifiers,
certificate ownership, application-domain APIs, Nginx compilation, and runtime activation remain
unchanged. Existing ungrouped hostnames stay accessible through compatibility APIs and are not
assigned to a root domain by unsafe suffix inference.

## Verification

- PostgreSQL migration and database contract validation.
- Tenant-isolated repository pagination and root-deletion conflict tests.
- Route/OpenAPI/SDK materialization and idempotency checks.
- Backend-admin route, interaction, typecheck, test, build, and responsive browser verification.

## Supersedes / Superseded By

None.

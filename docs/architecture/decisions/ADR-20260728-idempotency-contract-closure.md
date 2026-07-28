# ADR-20260728 Idempotency Contract Closure

Status: accepted
Requirement: REQ-2026-0066
Owner: SDKWork Web Server maintainers
Date: 2026-07-28
Specs: API_SPEC.md, SDK_SPEC.md, SDK_WORKSPACE_GENERATION_SPEC.md, FRONTEND_SPEC.md,
SECURITY_SPEC.md, TEST_SPEC.md

## Context

Web Server route manifests marked 28 management operations as idempotent, so the framework
correctly rejected requests without `Idempotency-Key`. Their OpenAPI authorities did not declare
the Header, which made generated SDK methods incapable of satisfying the runtime contract. Existing
checks validated prose and operation naming but not the concrete marker/Header/route/SDK parity.

Deployment creation also accepted an optional body key for repository deduplication. That created
two client-controlled retry identities and allowed the durable domain key to disagree with the
framework Header.

## Decision

1. `x-sdkwork-idempotent: true` and a required `Idempotency-Key` parameter are a strict pair.
2. The canonical shared parameter is a string with `minLength: 1` and `maxLength: 128`.
3. Authored OpenAPI is the semantic authority. Materializers preserve explicit metadata, reject
   mismatches, and never infer idempotency from HTTP methods or operationId substrings.
4. Route manifests and every generated SDK language preserve that requirement. Generated method
   inputs are the only consumer transport boundary; feature code cannot assemble the Header.
5. One logical action owns one unpredictable key. Transport retries and ambiguous-result retries
   reuse it; reopening or starting a distinct action creates a new key.
6. The framework remains fail-closed, trims empty values, rejects values above 128 bytes before
   store access, scopes keys by authenticated request identity/method/path, and fingerprints payloads.
7. Deployment JSON no longer owns idempotency. The framework-scoped identity is injected into the
   domain context and copied internally to repository deduplication.
8. Production HA requires a shared durable store with atomic reserve, replay, conflict, complete,
   release, and expiry semantics. Memory stores remain limited to development/test/standalone use.
9. CI compares authored contracts, materialized authorities, route manifests, generated TypeScript
   surfaces, and consumer code in addition to generator and runtime tests.

## Alternatives

- Make the Header optional at runtime: rejected because it permits duplicate externally visible
  side effects and hides contract drift.
- Generate a fresh key inside each SDK attempt: rejected because retries would no longer replay.
- Keep the body field as the durable authority: rejected because Header and body could disagree and
  every client would need duplicate transport logic.
- Patch generated SDK files: rejected because regeneration would erase the fix and violate SDK
  ownership.

## Consequences

- Marking an operation idempotent is now an intentional public SDK contract change.
- SDK calls for the 28 operations require a new typed argument in every generated language.
- Contract drift fails earlier, with precise operation labels, instead of becoming a production 400.
- Durable deployment deduplication now uses security-framework identity and cannot be supplied by
  untrusted JSON.
- Any future idempotent operation must update its authority OpenAPI and regenerate before consumers
  can compile.

## Verification

- Global operation-pattern tests cover JSON/YAML, inline/shared parameters, malformed headers, and
  external-protocol exemptions.
- SDK generator regression proves shared Header refs become required method inputs.
- Application contract tests prove 8 app, 18 backend, and 2 internal operations remain aligned.
- PC type checking and tests prove stable key forwarding through generated calls.
- Framework pipeline tests prove 128-byte acceptance and 129-byte rejection before store access.

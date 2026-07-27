# Webserver PC Source Configuration

`sdkwork.deployment.config.json` delegates runtime topology and deployment ownership to the enclosing Web Server application. The PC surface keeps only browser runtime sources and materialization metadata; it does not copy the parent topology profiles or start a second gateway.

Supported environments are `development`, `test`, `staging`, and `production`. Browser runtime sources use `browser/runtime-env.<deployment-profile>.<environment>.json` when a profile needs distinct values and otherwise fall back to `browser/runtime-env.<environment>.json`. Every selected source must declare the requested `deploymentProfile` and `environment`; `sdkwork.app.config.json` remains application identity metadata and is not a runtime-value source.

The schema authority is `CONFIG_SPEC.md`, `SOURCE_CONFIG_SPEC.md`, and `ENVIRONMENT_SPEC.md` in `sdkwork-specs`. Local overrides must use ignored local files or process-local environment input and must never modify tracked profiles. Secrets, access tokens, refresh tokens, API keys, certificate private keys, and bootstrap credentials are forbidden in browser runtime configuration; authenticated state comes from IAM and the shared TokenManager.

`scripts/materialize-runtime-env.mjs --deployment-profile <standalone|cloud> --environment <environment>` materializes exactly one selected source to `public/runtime-env.json` before Vite starts or builds. Add `--check` to verify the tracked output without writing. Validate this root with:

```powershell
node ../../../sdkwork-specs/tools/check-source-config-standard.mjs --root .
```

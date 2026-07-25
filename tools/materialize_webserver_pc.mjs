import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(repositoryRoot, "apps/sdkwork-webserver-pc");

const packages = [
  { id: "core", surface: "pc", capability: "runtime-core", deps: {} },
  { id: "commons", surface: "pc", capability: "shared-ui", deps: { react: "catalog:", "react-router-dom": "^7.15.0", "lucide-react": "catalog:" } },
  { id: "console-core", surface: "app-console", capability: "console-core", deps: { "@sdkwork/sdk-common": "workspace:*", "@sdkwork/web-app-sdk": "workspace:*", "@sdkwork/webserver-pc-commons": "workspace:*", react: "catalog:" }, sdk: "sdkwork-web-app-sdk" },
  { id: "console-shell", surface: "app-console", capability: "console-shell", deps: { "@sdkwork/webserver-pc-commons": "workspace:*", react: "catalog:" } },
  { id: "console-sites", surface: "app-console", capability: "sites", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["sites", "Sites", "Site lifecycle and availability", "web.sites.read"]] },
  { id: "console-site-configuration", surface: "app-console", capability: "site-configuration", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["configuration", "Configuration", "Environment variables and health checks", "web.sites.read"]] },
  { id: "console-delivery", surface: "app-console", capability: "delivery", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["domains", "Domains", "Domain ownership and routing", "web.sites.read"], ["certificates", "Certificates", "TLS certificate lifecycle", "web.certificates.read"]] },
  { id: "console-deployments", surface: "app-console", capability: "deployments", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["deployments", "Deployments", "Standalone deployment history and rollback", "web.sites.read"]] },
  { id: "admin-core", surface: "backend-admin", capability: "admin-core", deps: { "@sdkwork/web-backend-sdk": "workspace:*", "@sdkwork/webserver-pc-commons": "workspace:*", "@sdkwork/sdk-common": "workspace:*", react: "catalog:" }, sdk: "sdkwork-web-backend-sdk" },
  { id: "admin-shell", surface: "backend-admin", capability: "admin-shell", deps: { "@sdkwork/webserver-pc-commons": "workspace:*", react: "catalog:" } },
  { id: "admin-nginx", surface: "backend-admin", capability: "nginx", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["nginx", "Nginx", "Validate, deploy and reload Nginx configuration", "web.nginx.write"]] },
  { id: "admin-servers", surface: "backend-admin", capability: "servers", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["servers", "Servers", "Managed Web Server inventory", "web.servers.read"]] },
  { id: "admin-diagnostics", surface: "backend-admin", capability: "diagnostics", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["diagnostics", "Diagnostics", "Runtime status and convergence diagnostics", "web.servers.read"]] },
  { id: "admin-audit", surface: "backend-admin", capability: "audit", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["audit", "Audit", "Operator action evidence", "web.auditLogs.read"]] },
];

for (const definition of packages) {
  const directory = resolve(appRoot, "packages", `sdkwork-webserver-pc-${definition.id}`);
  mkdirSync(resolve(directory, "src"), { recursive: true });
  mkdirSync(resolve(directory, "specs"), { recursive: true });
  writeJson(resolve(directory, "package.json"), packageManifest(definition));
  writeJson(resolve(directory, "specs/component.spec.json"), componentSpec(definition));
  writeFileSync(resolve(directory, "specs/README.md"), specsReadme(definition), "utf8");
  if (definition.module) {
    writeFileSync(resolve(directory, "src/module.ts"), moduleSource(definition), "utf8");
    writeFileSync(resolve(directory, "src/index.ts"), "export { webserverModule } from \"./module.ts\";\n", "utf8");
  }
}

function packageManifest(definition) {
  return {
    name: `@sdkwork/webserver-pc-${definition.id}`,
    version: "0.1.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    exports: { ".": { types: "./src/index.ts", import: "./src/index.ts", default: "./src/index.ts" } },
    dependencies: definition.deps,
    sdkwork: {
      applicationCode: "webserver",
      architecture: "pc-react",
      capability: definition.capability,
      surface: definition.surface,
      managedBy: "tools/materialize_webserver_pc.mjs",
    },
  };
}

function componentSpec(definition) {
  const sdkDependencies = definition.sdk ? [{ workspace: definition.sdk, surface: definition.surface === "backend-admin" ? "backend-api" : "app-api", credentialMode: definition.surface === "backend-admin" ? "authenticated-backend-admin" : "authenticated-app-api" }] : [];
  return {
    schemaVersion: 1,
    kind: "sdkwork.component.spec",
    component: {
      name: `@sdkwork/webserver-pc-${definition.id}`,
      displayName: `SDKWork Webserver PC ${definition.capability}`,
      version: "0.1.0",
      type: "node-package",
      root: `sdkwork-web-server/apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-${definition.id}`,
      domain: "infrastructure",
      capability: definition.capability,
      surface: definition.surface,
      languages: ["typescript"],
      generated: false,
      private: true,
      status: "active",
      manifests: ["package.json", "specs/component.spec.json"],
    },
    canonicalSpecs: [
      { file: "COMPONENT_SPEC.md", path: "../../../../../sdkwork-specs/COMPONENT_SPEC.md", purpose: "Component contract." },
      { file: "APP_PC_ARCHITECTURE_SPEC.md", path: "../../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md", purpose: "PC package and surface boundaries." },
      { file: "APP_PC_REACT_UI_SPEC.md", path: "../../../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md", purpose: "React PC implementation." },
      { file: "SDK_SPEC.md", path: "../../../../../sdkwork-specs/SDK_SPEC.md", purpose: "Generated SDK consumption." },
      { file: "TEST_SPEC.md", path: "../../../../../sdkwork-specs/TEST_SPEC.md", purpose: "Verification." },
    ],
    contracts: {
      publicExports: ["src/index.ts"],
      runtimeEntrypoints: [],
      routeManifest: null,
      sdkClients: [],
      sdkDependencies,
      permissionComposition: {
        inheritanceMode: "openapi-with-explicit-ui-hints",
        routePermissionHints: { inheritFromOpenApi: true, overrides: [] },
        consumerPolicy: { forbidLocalPermissionCatalogForDependencyDomains: true, allowFrontendHintsWithoutServerDuplication: true },
      },
      events: [],
      configKeys: [],
      permissions: definition.module?.map((entry) => entry[3]) ?? [],
    },
    integration: {
      authority: "Root SDKWork specs remain authoritative.",
      dependencyPolicy: "Consume sibling packages through public exports only.",
      sdkPolicy: definition.surface === "backend-admin" ? "Backend SDK access is isolated behind admin-core." : "App SDK access is isolated behind console-core.",
    },
    verification: { commands: ["pnpm --dir apps/sdkwork-webserver-pc typecheck", "pnpm --dir apps/sdkwork-webserver-pc test"] },
    metadata: { managedBy: "tools/materialize_webserver_pc.mjs", standardVersion: "2026-07-24" },
  };
}

function moduleSource(definition) {
  const entries = definition.module.map(([resource, label, description, permission], index) => `    { resource: "${resource}", label: "${label}", description: "${description}", permission: "${permission}", order: ${index + 1} }`).join(",\n");
  return `import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";\n\nexport const webserverModule = {\n  id: "${definition.capability}",\n  label: "${definition.capability.replaceAll("-", " ")}",\n  surface: "${definition.surface}",\n  entries: [\n${entries}\n  ],\n} as const satisfies WebserverPcModuleDefinition;\n`;
}

function specsReadme(definition) {
  return `# ${definition.capability}\n\nThis package owns the ${definition.capability} capability on the ${definition.surface} surface. Its component contract links the canonical SDKWork standards; normative text is not duplicated locally.\n`;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

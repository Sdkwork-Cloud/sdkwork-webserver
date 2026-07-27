import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(repositoryRoot, "apps/sdkwork-webserver-pc");

const packages = [
  { id: "core", surface: "pc", capability: "runtime-core", deps: {}, coreComposition: true },
  { id: "commons", surface: "pc", capability: "shared-ui", deps: { react: "catalog:", "react-router-dom": "^7.15.0", "lucide-react": "catalog:" } },
  { id: "console-core", surface: "app-console", capability: "console-core", deps: { "@sdkwork/sdk-common": "workspace:*", "@sdkwork/web-app-sdk": "workspace:*", "@sdkwork/webserver-pc-commons": "workspace:*", react: "catalog:" }, sdk: "sdkwork-web-app-sdk", sdkPackage: "@sdkwork/web-app-sdk", sdkAuthority: "sdkwork-web.app", coreComposition: true },
  { id: "console-shell", surface: "app-console", capability: "console-shell", deps: { "@sdkwork/webserver-pc-commons": "workspace:*", react: "catalog:" } },
  { id: "console-sites", surface: "app-console", capability: "sites", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["sites", "Sites", "Site lifecycle and availability", "web.sites.read"]] },
  { id: "console-site-configuration", surface: "app-console", capability: "site-configuration", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["configuration", "Configuration", "Environment variables and health checks", "web.sites.read"]] },
  { id: "console-delivery", surface: "app-console", capability: "delivery", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["domains", "Domains", "Domain ownership and routing", "web.sites.read"], ["certificates", "Certificates", "TLS certificate lifecycle", "web.certificates.read"]] },
  { id: "console-deployments", surface: "app-console", capability: "deployments", deps: { "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["deployments", "Deployments", "Standalone deployment history and rollback", "web.sites.read"]] },
  { id: "admin-core", surface: "backend-admin", capability: "admin-core", deps: { "@sdkwork/web-backend-sdk": "workspace:*", "@sdkwork/webserver-pc-commons": "workspace:*", "@sdkwork/sdk-common": "workspace:*", react: "catalog:" }, sdk: "sdkwork-web-backend-sdk", sdkPackage: "@sdkwork/web-backend-sdk", sdkAuthority: "sdkwork-web.backend", coreComposition: true },
  { id: "admin-shell", surface: "backend-admin", capability: "admin-shell", deps: { "@sdkwork/webserver-pc-commons": "workspace:*", react: "catalog:" } },
  { id: "admin-applications", surface: "backend-admin", capability: "applications", deps: { "@sdkwork/webserver-pc-admin-core": "workspace:*", "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["applications", "Applications", "Deploy WEB and API applications", "web.sites.read"], ["application-domains", "Application domains", "Public domains bound to an application", "web.sites.read"], ["application-deployments", "Application deployments", "Application deployment history", "web.sites.read"]], dataSource: "./data-source.ts" },
  { id: "admin-certificates", surface: "backend-admin", capability: "certificates", deps: { "@sdkwork/webserver-pc-admin-core": "workspace:*", "@sdkwork/webserver-pc-commons": "workspace:*" }, module: [["managed-certificates", "Certificates", "Canonical certificate lifecycle and renewal", "web.certificates.read"], ["certificate-distribution", "Certificate distribution", "Certificate convergence across managed servers", "web.certificates.read"]], dataSource: "./data-source.ts" },
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
    writeFileSync(resolve(directory, "src/index.ts"), moduleIndexSource(definition), "utf8");
  }
  if (definition.coreComposition) {
    materializeCoreComposition(directory, definition);
  }
}

function moduleIndexSource(definition) {
  const exports = ["export { webserverModule } from \"./module.ts\";"];
  if (definition.dataSource) exports.push(`export * from "${definition.dataSource}";`);
  return `${exports.join("\n")}\n`;
}

function packageManifest(definition) {
  const packageExports = {
    ".": packageExport("./src/index.ts"),
  };
  if (definition.coreComposition) {
    packageExports["./sdk"] = packageExport("./src/sdk/index.ts");
    packageExports["./modules"] = packageExport("./src/modules/index.ts");
    packageExports["./host"] = packageExport("./src/host/index.ts");
    packageExports["./session"] = packageExport("./src/session/index.ts");
    packageExports["./composition"] = packageExport("./src/composition/index.ts");
  }
  return {
    name: `@sdkwork/webserver-pc-${definition.id}`,
    version: "0.1.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    exports: packageExports,
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
  const sdkDependencies = definition.sdk ? [{ workspace: definition.sdk, permissionModuleId: "web", surface: definition.surface === "backend-admin" ? "backend-api" : "app-api", credentialMode: definition.surface === "backend-admin" ? "authenticated-backend-admin" : "authenticated-app-api" }] : [];
  const publicExports = definition.coreComposition
    ? [".", "./sdk", "./modules", "./host", "./session", "./composition"]
    : ["src/index.ts"];
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
      publicExports,
      runtimeEntrypoints: [],
      routeManifest: null,
      sdkClients: [],
      sdkDependencies,
      permissionComposition: permissionComposition(definition),
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

function packageExport(path) {
  return { types: path, import: path, default: path };
}

function permissionComposition(definition) {
  if (!definition.coreComposition) {
    return {
      inheritanceMode: "openapi-with-explicit-ui-hints",
      routePermissionHints: { inheritFromOpenApi: true, overrides: [] },
      consumerPolicy: { forbidLocalPermissionCatalogForDependencyDomains: true, allowFrontendHintsWithoutServerDuplication: true },
    };
  }
  if (!definition.sdk) {
    return {
      inheritanceMode: "module-catalog-with-overrides",
      moduleCatalogRefs: [],
      routePermissionHints: { inheritFromOpenApi: true, inheritFromModuleManifests: true, overrides: [] },
      consumerPolicy: { forbidLocalPermissionCatalogForDependencyDomains: true, allowExplicitOverridesOnly: true, allowFrontendHintsWithoutServerDuplication: true },
    };
  }
  return {
    inheritanceMode: "module-catalog-with-overrides",
    moduleCatalogRefs: [{ moduleId: "web", manifestRef: "../../../../../specs/iam.module.manifest.json", inheritPermissions: true, inheritRoles: true }],
    bootstrapAccessTokenScope: { inheritFrom: "sdkwork.app.config.json#backend.accessTokenPermissionScope", supplement: [], overrideReplace: false },
    routePermissionHints: { inheritFromOpenApi: true, inheritFromModuleManifests: true, overrides: [] },
    consumerPolicy: { forbidLocalPermissionCatalogForDependencyDomains: true, allowExplicitOverridesOnly: true, allowFrontendHintsWithoutServerDuplication: true },
  };
}

function materializeCoreComposition(directory, definition) {
  for (const child of ["composition", "host", "modules", "sdk", "session"]) {
    mkdirSync(resolve(directory, "src", child), { recursive: true });
  }
  const emptyExport = "export {};\n";
  writeFileSync(resolve(directory, "src/host/index.ts"), emptyExport, "utf8");
  writeFileSync(resolve(directory, "src/modules/index.ts"), emptyExport, "utf8");
  writeFileSync(resolve(directory, "src/session/index.ts"), emptyExport, "utf8");
  writeFileSync(
    resolve(directory, "src/sdk/index.ts"),
    definition.sdk ? 'export * from "../index.tsx";\n' : emptyExport,
    "utf8",
  );
  writeFileSync(resolve(directory, "src/composition/dependency-manifest.ts"), 'export const webserverComponentSpecPath = "../../specs/component.spec.json" as const;\n', "utf8");
  writeFileSync(resolve(directory, "src/composition/sdk-inventory.ts"), sdkInventorySource(definition), "utf8");
  writeFileSync(resolve(directory, "src/composition/module-registry.ts"), "export function createWebserverCoreModuleRegistry() {\n  return {} as const;\n}\n", "utf8");
  writeFileSync(resolve(directory, "src/composition/host-registry.ts"), "export function createWebserverCoreHostRegistry() {\n  return {} as const;\n}\n", "utf8");
  writeFileSync(resolve(directory, "src/composition/index.ts"), [
    'export * from "./dependency-manifest.ts";',
    'export * from "./sdk-inventory.ts";',
    'export * from "./module-registry.ts";',
    'export * from "./host-registry.ts";',
    "",
  ].join("\n"), "utf8");
}

function sdkInventorySource(definition) {
  const inventory = definition.sdkPackage
    ? `\n    { packageName: "${definition.sdkPackage}", authority: "${definition.sdkAuthority}", surface: "${definition.surface === "backend-admin" ? "backend-api" : "app-api"}" },`
    : "";
  return `export function listWebserverCoreSdkInventory() {\n  return [${inventory}\n  ] as const;\n}\n`;
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

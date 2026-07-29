import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "deployments",
  label: "deployments",
  surface: "app-console",
  entries: [
    { resource: "source-versions", label: "Source versions", description: "Immutable Drive-backed application source versions", permission: "web.sites.write", order: 1 },
    { resource: "deployments", label: "Deployments", description: "Release history and rollback", permission: "web.sites.write", order: 2 }
  ],
} as const satisfies WebserverPcModuleDefinition;

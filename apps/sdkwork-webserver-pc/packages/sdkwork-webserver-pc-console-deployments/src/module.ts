import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "deployments",
  label: "deployments",
  surface: "app-console",
  entries: [
    { resource: "deployments", label: "Deployments", description: "Standalone deployment history and rollback", permission: "web.sites.read", order: 1 }
  ],
} as const satisfies WebserverPcModuleDefinition;

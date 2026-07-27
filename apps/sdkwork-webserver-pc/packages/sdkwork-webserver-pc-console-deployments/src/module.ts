import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "deployments",
  label: "deployments",
  surface: "app-console",
  entries: [
    { resource: "deployments", label: "Deployments", description: "Drive-backed package release, status history, and rollback", permission: "web.sites.write", order: 1 }
  ],
} as const satisfies WebserverPcModuleDefinition;

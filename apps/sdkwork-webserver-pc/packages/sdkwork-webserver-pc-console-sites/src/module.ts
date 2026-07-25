import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "sites",
  label: "sites",
  surface: "app-console",
  entries: [
    { resource: "sites", label: "Sites", description: "Site lifecycle and availability", permission: "web.sites.read", order: 1 }
  ],
} as const satisfies WebserverPcModuleDefinition;

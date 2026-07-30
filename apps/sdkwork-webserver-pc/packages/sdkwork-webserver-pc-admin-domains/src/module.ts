import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "domains",
  label: "domains",
  surface: "backend-admin",
  entries: [
    { resource: "managed-domains", label: "Custom domains", description: "Tenant domain assets, application bindings, and certificates", permission: "web.sites.read", order: 1 }
  ],
} as const satisfies WebserverPcModuleDefinition;

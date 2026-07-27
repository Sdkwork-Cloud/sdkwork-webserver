import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "applications",
  label: "applications",
  surface: "backend-admin",
  entries: [
    { resource: "applications", label: "Applications", description: "Deploy WEB and API applications", permission: "web.sites.read", order: 1 },
    { resource: "application-domains", label: "Application domains", description: "Public domains bound to an application", permission: "web.sites.read", order: 2 },
    { resource: "application-deployments", label: "Application deployments", description: "Application deployment history", permission: "web.sites.read", order: 3 }
  ],
} as const satisfies WebserverPcModuleDefinition;

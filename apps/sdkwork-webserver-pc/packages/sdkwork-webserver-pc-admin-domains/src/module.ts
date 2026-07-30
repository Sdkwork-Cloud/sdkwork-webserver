import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "domains",
  label: "domains",
  surface: "backend-admin",
  entries: [
    { resource: "root-domains", label: "Domain management", description: "Root-domain Zones, hostnames, deployments, and TLS", permission: "web.sites.read", order: 1 }
  ],
} as const satisfies WebserverPcModuleDefinition;

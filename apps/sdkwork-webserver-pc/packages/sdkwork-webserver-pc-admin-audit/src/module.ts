import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "audit",
  label: "audit",
  surface: "backend-admin",
  entries: [
    { resource: "audit", label: "Audit", description: "Operator action evidence", permission: "web.auditLogs.read", order: 1 }
  ],
} as const satisfies WebserverPcModuleDefinition;

import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";

export const webserverModule = {
  id: "certificates",
  label: "certificates",
  surface: "backend-admin",
  entries: [
    { resource: "managed-certificates", label: "Certificates", description: "Canonical certificate lifecycle and renewal", permission: "web.certificates.read", order: 1 },
    { resource: "certificate-distribution", label: "Certificate distribution", description: "Certificate convergence across managed servers", permission: "web.certificates.read", order: 2 }
  ],
} as const satisfies WebserverPcModuleDefinition;

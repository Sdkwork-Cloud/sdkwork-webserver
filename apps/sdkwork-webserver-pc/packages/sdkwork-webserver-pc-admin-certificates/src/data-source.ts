import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import {
  normalizeWebserverPage,
  type WebserverResourceAction,
  type WebserverResourceActionContext,
  type WebserverResourceDataSource,
  type WebserverResourceRegistry,
} from "@sdkwork/webserver-pc-commons";

export function createWebserverAdminCertificateRegistry(client: WebserverAdminSdkClient): WebserverResourceRegistry {
  return {
    "managed-certificates": source(
      (query) => client.certificate.list({ page: query.page, pageSize: query.pageSize }),
      [
        action(
          "create",
          "Issue certificate",
          { domainId: "", certType: 1, autoRenew: true },
          (context) => client.certificate.create(context.body as unknown as Parameters<typeof client.certificate.create>[0]),
          { fieldOptions: { certType: [1, 3] }, permission: "web.certificates.write" },
        ),
        action(
          "update-renewal",
          "Update automatic renewal",
          { autoRenew: true },
          (context) => client.certificate.update(selectedId(context), context.body as unknown as Parameters<typeof client.certificate.update>[1]),
          { requiresSelection: true, permission: "web.certificates.write" },
        ),
        action(
          "renew",
          "Renew now",
          {},
          (context) => client.certificate.renew(selectedId(context)),
          { dangerous: true, requiresSelection: true, permission: "web.certificates.write" },
        ),
      ],
    ),
    "certificate-distribution": source(
      (query) => client.certificateDistribution.certificates.distribution.list({ page: query.page, pageSize: query.pageSize }),
      [],
    ),
  };
}

function source(
  load: WebserverResourceDataSource["load"] extends (query: infer Query) => Promise<unknown> ? (query: Query) => Promise<unknown> : never,
  actions: readonly WebserverResourceAction[],
): WebserverResourceDataSource {
  return { actions, async load(query) { return normalizeWebserverPage(await load(query)); } };
}

function action(
  id: string,
  label: string,
  bodyTemplate: Record<string, unknown>,
  execute: WebserverResourceAction["execute"],
  options: Omit<WebserverResourceAction, "bodyTemplate" | "execute" | "id" | "label"> = {},
): WebserverResourceAction {
  return { id, label, bodyTemplate, execute, ...options };
}

function selectedId(context: WebserverResourceActionContext): string {
  const value = context.selectedItem?.id;
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Selected certificate ID is unavailable");
  return String(value);
}

import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import {
  normalizeWebserverPage,
  type WebserverResourceAction,
  type WebserverResourceActionContext,
  type WebserverResourceDataSource,
  type WebserverResourceFieldOption,
  type WebserverResourceRegistry,
} from "@sdkwork/webserver-pc-commons";

type CertificateCreateRequest = Parameters<WebserverAdminSdkClient["certificate"]["create"]>[0];
type CertificateUpdateRequest = Parameters<WebserverAdminSdkClient["certificate"]["update"]>[1];

export function createWebserverAdminCertificateRegistry(client: WebserverAdminSdkClient): WebserverResourceRegistry {
  return {
    "managed-certificates": source(
      (query) => client.certificate.list({ page: query.page, pageSize: query.pageSize }),
      [
        action(
          "create",
          "Issue certificate",
          { domainIds: [], certType: 1, keyAlgorithm: "ECDSA", autoRenew: true },
          async (context) => client.certificate.create(createCertificateRequest(context.body), idempotencyParams(context)),
          {
            fieldOptions: { domainIds: [], certType: [1, 3], keyAlgorithm: ["ECDSA", "RSA"] },
            loadFieldOptions: async () => ({ domainIds: await domainOptions(client) }),
            multipleFields: ["domainIds"],
            permission: "web.certificates.write",
            requiredFields: ["domainIds"],
          },
        ),
        action(
          "update-renewal",
          "Update automatic renewal",
          { autoRenew: true },
          async (context) => client.certificate.update(selectedId(context), updateCertificateRequest(context.body), idempotencyParams(context)),
          { requiresSelection: true, permission: "web.certificates.write" },
        ),
        action(
          "renew",
          "Renew now",
          {},
          (context) => client.certificate.renew(selectedId(context), idempotencyParams(context)),
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

async function domainOptions(
  client: WebserverAdminSdkClient,
): Promise<WebserverResourceFieldOption[]> {
  const options: WebserverResourceFieldOption[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const response = await client.domain.list({ page, pageSize: 100 });
    options.push(...response.items.map((domain) => ({
      label: `${domain.hostname} - ${domain.applicationName ?? "Unbound"}`,
      value: domain.id,
    })));
    hasMore = response.pageInfo.hasMore === true;
    page += 1;
  }
  return options;
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

function idempotencyParams(context: WebserverResourceActionContext): { idempotencyKey: string } {
  const idempotencyKey = context.idempotencyKey?.trim();
  if (!idempotencyKey) throw new Error("Idempotency key is required");
  return { idempotencyKey };
}

function createCertificateRequest(body: Readonly<Record<string, unknown>>): CertificateCreateRequest {
  const certType = certificateType(body.certType);
  const autoRenew = optionalBoolean(body.autoRenew, "Automatic renewal");
  if (certType === 3 && autoRenew === true) {
    throw new Error("Automatic renewal is unavailable for self-signed certificates");
  }
  return {
    domainIds: requiredTextList(body.domainIds, "Certificate domains", 8),
    certType,
    keyAlgorithm: certificateKeyAlgorithm(body.keyAlgorithm),
    autoRenew,
  };
}

function updateCertificateRequest(body: Readonly<Record<string, unknown>>): CertificateUpdateRequest {
  return { autoRenew: requiredBoolean(body.autoRenew, "Automatic renewal") };
}

function certificateType(value: unknown): 1 | 3 {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 3) return parsed;
  throw new Error("Certificate type is invalid");
}

function certificateKeyAlgorithm(value: unknown): "ECDSA" | "RSA" {
  if (value === "ECDSA" || value === "RSA") return value;
  throw new Error("Certificate key algorithm is invalid");
}

function requiredTextList(value: unknown, label: string, maximum: number): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} is required`);
  const items = [...new Set(value.map((item) => requiredText(item, label)))];
  if (items.length === 0 || items.length > maximum) {
    throw new Error(`${label} must contain between 1 and ${maximum} unique values`);
  }
  return items;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} is invalid`);
  return value;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  return requiredBoolean(value, label);
}

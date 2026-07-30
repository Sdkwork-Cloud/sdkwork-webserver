import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import {
  normalizeWebserverPage,
  type WebserverResourceAction,
  type WebserverResourceActionContext,
  type WebserverResourceDataSource,
  type WebserverResourceFieldOption,
  type WebserverResourceRegistry,
} from "@sdkwork/webserver-pc-commons";

type CreateDomainRequest = Parameters<WebserverAdminSdkClient["domain"]["create"]>[0];
type BindDomainRequest = Parameters<WebserverAdminSdkClient["domain"]["applicationBinding"]["update"]>[1];
type CreateCertificateRequest = Parameters<WebserverAdminSdkClient["certificate"]["create"]>[0];

export function createWebserverAdminDomainRegistry(
  client: WebserverAdminSdkClient,
): WebserverResourceRegistry {
  return {
    "managed-domains": source(
      (query) => client.domain.list({ page: query.page, pageSize: query.pageSize }),
      [
        action(
          "create",
          "Register domain",
          {
            hostname: "",
            applicationId: "",
            isPrimary: false,
            sslEnabled: true,
            sslProvider: "letsencrypt",
          },
          (context) => client.domain.create(createDomainRequest(context.body), idempotencyParams(context)),
          {
            fieldOptions: { applicationId: [], sslProvider: ["letsencrypt", "custom", "none"] },
            loadFieldOptions: async () => ({
              applicationId: [
                { label: "Unbound", value: "" },
                ...await applicationOptions(client),
              ],
            }),
            permission: "web.sites.write",
            requiredFields: ["hostname"],
          },
        ),
        action(
          "verify",
          "Verify domain",
          {},
          (context) => client.domain.verify(selectedId(context), idempotencyParams(context)),
          {
            availableWhen: ({ selectedItem }) => selectedItem?.isVerified !== true,
            permission: "web.sites.write",
            requiresSelection: true,
          },
        ),
        action(
          "bind",
          "Bind application",
          { applicationId: "", isPrimary: false },
          (context) => client.domain.applicationBinding.update(
            selectedId(context),
            bindDomainRequest(context.body),
            idempotencyParams(context),
          ),
          {
            availableWhen: ({ selectedItem }) => !hasText(selectedItem?.applicationId),
            fieldOptions: { applicationId: [] },
            loadFieldOptions: async () => ({ applicationId: await applicationOptions(client) }),
            permission: "web.sites.write",
            requiredFields: ["applicationId"],
            requiresConfirmation: true,
            requiresSelection: true,
          },
        ),
        action(
          "unbind",
          "Unbind application",
          {},
          (context) => client.domain.applicationBinding.delete(selectedId(context), idempotencyParams(context)),
          {
            availableWhen: ({ selectedItem }) => hasText(selectedItem?.applicationId),
            dangerous: true,
            permission: "web.sites.write",
            requiresConfirmation: true,
            requiresSelection: true,
          },
        ),
        action(
          "issue-certificate",
          "Issue certificate",
          { certType: 1, autoRenew: true },
          (context) => client.certificate.create(
            createCertificateRequest(selectedId(context), context.body),
            idempotencyParams(context),
          ),
          {
            fieldOptions: { certType: [1, 3] },
            permission: "web.certificates.write",
            requiresSelection: true,
          },
        ),
        action(
          "delete",
          "Delete domain",
          {},
          (context) => client.domain.delete(selectedId(context), idempotencyParams(context)),
          {
            availableWhen: ({ selectedItem }) => (
              !hasText(selectedItem?.applicationId)
              && Number(selectedItem?.certificateCount ?? 0) === 0
            ),
            dangerous: true,
            permission: "web.sites.write",
            requiresConfirmation: true,
            requiresSelection: true,
          },
        ),
      ],
    ),
  };
}

function source(
  load: WebserverResourceDataSource["load"] extends (query: infer Query) => Promise<unknown>
    ? (query: Query) => Promise<unknown>
    : never,
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

async function applicationOptions(
  client: WebserverAdminSdkClient,
): Promise<WebserverResourceFieldOption[]> {
  const options: WebserverResourceFieldOption[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const response = await client.application.list({ page, pageSize: 100 });
    options.push(...response.items.map((application) => ({
      label: `${application.name} - ${application.applicationType}`,
      value: application.id,
    })));
    hasMore = response.pageInfo.hasMore === true;
    page += 1;
  }
  return options;
}

function createDomainRequest(body: Readonly<Record<string, unknown>>): CreateDomainRequest {
  const applicationId = optionalText(body.applicationId);
  const isPrimary = requiredBoolean(body.isPrimary, "Primary domain");
  if (!applicationId && isPrimary) {
    throw new Error("An unbound domain cannot be primary");
  }
  return {
    hostname: hostname(body.hostname),
    applicationId,
    isPrimary,
    sslEnabled: requiredBoolean(body.sslEnabled, "HTTPS"),
    sslProvider: sslProvider(body.sslProvider),
  };
}

function bindDomainRequest(body: Readonly<Record<string, unknown>>): BindDomainRequest {
  return {
    applicationId: requiredText(body.applicationId, "Application"),
    isPrimary: requiredBoolean(body.isPrimary, "Primary domain"),
  };
}

function createCertificateRequest(
  domainId: string,
  body: Readonly<Record<string, unknown>>,
): CreateCertificateRequest {
  const certType = certificateType(body.certType);
  const autoRenew = requiredBoolean(body.autoRenew, "Automatic renewal");
  if (certType === 3 && autoRenew) {
    throw new Error("Automatic renewal is unavailable for self-signed certificates");
  }
  return { domainId, certType, autoRenew };
}

function selectedId(context: WebserverResourceActionContext): string {
  return requiredText(context.selectedItem?.id, "Selected domain");
}

function idempotencyParams(context: WebserverResourceActionContext): { idempotencyKey: string } {
  return { idempotencyKey: requiredText(context.idempotencyKey, "Idempotency key") };
}

function hostname(value: unknown): string {
  const text = requiredText(value, "Domain").toLowerCase();
  if (text.length > 253 || text.startsWith(".") || text.endsWith(".") || text.split(".").some((label) => (
    !label
    || label.length > 63
    || label.startsWith("-")
    || label.endsWith("-")
    || !/^[a-z0-9-]+$/.test(label)
  ))) {
    throw new Error("Domain must be a valid DNS hostname");
  }
  return text;
}

function certificateType(value: unknown): 1 | 3 {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 3) return parsed;
  throw new Error("Certificate type is invalid");
}

function sslProvider(value: unknown): "letsencrypt" | "custom" | "none" | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "letsencrypt" || value === "custom" || value === "none") return value;
  throw new Error("Certificate provider is invalid");
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} is invalid`);
  return value;
}

function requiredText(value: unknown, label: string): string {
  const text = optionalText(value);
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && Boolean(value.trim());
}

import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import {
  normalizeWebserverPage,
  type WebserverResourceAction,
  type WebserverResourceActionContext,
  type WebserverResourceDataSource,
  type WebserverResourceRegistry,
} from "@sdkwork/webserver-pc-commons";

export function createWebserverAdminApplicationRegistry(client: WebserverAdminSdkClient): WebserverResourceRegistry {
  return {
    applications: source(
      (query) => client.application.list({ page: query.page, pageSize: query.pageSize, keyword: query.search }),
      [
        action(
          "create",
          "Create application",
          { name: "", applicationType: "WEB", siteType: 1 },
          (context) => client.application.create(context.body as unknown as Parameters<typeof client.application.create>[0]),
          { fieldOptions: { applicationType: ["WEB", "API"], siteType: [1, 2, 3, 4, 5, 6] } },
        ),
      ],
    ),
    "application-domains": applicationSource(
      (query) => client.applicationDomain.applications.domains.list(requiredApplicationId(query.scopeId), { page: query.page, pageSize: query.pageSize }),
      [
        action(
          "create",
          "Bind domain",
          { hostname: "", isPrimary: false, sslEnabled: true, sslProvider: "letsencrypt" },
          (context) => client.applicationDomain.applications.domains.create(
            requiredApplicationId(context.scopeId),
            context.body as unknown as Parameters<typeof client.applicationDomain.applications.domains.create>[1],
          ),
          { requiresScope: true, fieldOptions: { sslProvider: ["letsencrypt", "custom", "none"] } },
        ),
        action(
          "verify",
          "Verify domain",
          {},
          (context) => client.applicationDomain.applications.domains.verify(requiredApplicationId(context.scopeId), selectedId(context)),
          { requiresScope: true, requiresSelection: true },
        ),
      ],
    ),
    "application-deployments": applicationSource(
      (query) => client.applicationDeployment.applications.deployments.list(requiredApplicationId(query.scopeId), { page: query.page, pageSize: query.pageSize }),
      [
        action(
          "deploy",
          "Deploy application",
          { deployType: 1, environment: "production" },
          (context) => client.applicationDeployment.applications.deployments.create(
            requiredApplicationId(context.scopeId),
            context.body as unknown as Parameters<typeof client.applicationDeployment.applications.deployments.create>[1],
          ),
          { dangerous: true, requiresScope: true, fieldOptions: { deployType: [1, 2, 3, 4] } },
        ),
      ],
    ),
  };
}

function source(
  load: WebserverResourceDataSource["load"] extends (query: infer Query) => Promise<unknown> ? (query: Query) => Promise<unknown> : never,
  actions: readonly WebserverResourceAction[],
): WebserverResourceDataSource {
  return { actions, async load(query) { return normalizeWebserverPage(await load(query)); } };
}

function applicationSource(load: Parameters<typeof source>[0], actions: readonly WebserverResourceAction[]): WebserverResourceDataSource {
  return { ...source(load, actions), requiresScope: true, scopeKind: "application" };
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

function requiredApplicationId(value: string | undefined): string {
  if (!value?.trim()) throw new Error("Application ID is required");
  return value.trim();
}

function selectedId(context: WebserverResourceActionContext): string {
  const value = context.selectedItem?.id;
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Selected resource ID is unavailable");
  return String(value);
}

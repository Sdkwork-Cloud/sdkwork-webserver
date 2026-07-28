import { normalizeWebserverPage, type WebserverResourceAction, type WebserverResourceActionContext, type WebserverResourceDataSource, type WebserverResourceRegistry } from "@sdkwork/webserver-pc-commons";
import { createClient, type SdkworkBackendClient } from "@sdkwork/web-backend-sdk";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import { createContext, useContext, type ReactNode } from "react";

export type WebserverAdminSdkClient = SdkworkBackendClient;
const Context = createContext<WebserverAdminSdkClient | null>(null);
export function createWebserverAdminSdkClient(baseUrl: string, tokenManager: AuthTokenManager): WebserverAdminSdkClient { return createClient({ baseUrl, authMode: "dual-token", platform: "pc", tokenManager }); }
export function WebserverAdminSdkProvider({ children, client }: { children: ReactNode; client: WebserverAdminSdkClient }) { return <Context.Provider value={client}>{children}</Context.Provider>; }
export function useWebserverAdminSdk(): WebserverAdminSdkClient { const client = useContext(Context); if (!client) throw new Error("WebserverAdminSdkProvider is required"); return client; }

export function createWebserverAdminRegistry(client: WebserverAdminSdkClient): WebserverResourceRegistry {
  return {
    nginx: source((query) => client.nginx.configs.list({ page: query.page, pageSize: query.pageSize }), [
      action("create", "Create config", { configType: 1, configName: "", configContent: "" }, (context) => client.nginx.configs.create(context.body as unknown as Parameters<typeof client.nginx.configs.create>[0], idempotencyParams(context)), { fieldOptions: { configType: [1, 2, 3, 4] }, permission: "web.nginx.write" }),
      action("update", "Update", { configName: "", configContent: "" }, (context) => client.nginx.configs.update(selectedId(context, "id"), context.body as unknown as Parameters<typeof client.nginx.configs.update>[1], idempotencyParams(context)), { permission: "web.nginx.write", selection: true }),
      action("validate", "Validate", {}, (context) => client.nginx.configs.validate(selectedId(context, "id")), { permission: "web.nginx.write", selection: true }),
      action("deploy", "Deploy", {}, (context) => client.nginx.configs.deploy(selectedId(context, "id"), idempotencyParams(context)), { dangerous: true, permission: "web.nginx.write", selection: true }),
      action("reload", "Reload runtime", {}, (context) => client.nginx.reload.create(idempotencyParams(context)), { dangerous: true, permission: "web.nginx.write" }),
    ]),
    servers: source((query) => client.server.list({ page: query.page, pageSize: query.pageSize }), [
      action("create", "Register server", { name: "", host: "", sshPort: 22, tenantScopeHash: "" }, (context) => client.server.create(context.body as unknown as Parameters<typeof client.server.create>[0], idempotencyParams(context)), { permission: "web.servers.write", requiredFields: ["name", "host", "tenantScopeHash"], resultFields: ["agentToken", "id", "name", "host", "sshPort"] }),
    ]),
    diagnostics: source(async () => client.nginx.status.retrieve(), [action("reload", "Reload runtime", {}, (context) => client.nginx.reload.create(idempotencyParams(context)), { dangerous: true, permission: "web.nginx.write" })]),
    audit: {
      ...source((query) => client.audit.auditLogs.list({
        page: query.page,
        pageSize: query.pageSize,
        targetType: filterValue(query.filters, "targetType"),
        action: filterValue(query.filters, "action") ?? query.search,
        operatorId: filterValue(query.filters, "operatorId"),
        startDate: filterValue(query.filters, "startDate"),
        endDate: filterValue(query.filters, "endDate"),
      }), []),
      filters: [
        { id: "targetType", type: "select", fieldOptions: ["site", "domain", "deployment", "certificate", "nginx_config", "server"] },
        { id: "action", type: "text" },
        { id: "operatorId", type: "text" },
        { id: "startDate", type: "date" },
        { id: "endDate", type: "date" },
      ],
    },
  };
}

function source(load: WebserverResourceDataSource["load"] extends (query: infer Q) => Promise<unknown> ? (query: Q) => Promise<unknown> : never, actions: readonly WebserverResourceAction[]): WebserverResourceDataSource { return { actions, async load(query) { return normalizeWebserverPage(await load(query)); } }; }
function action(id: string, label: string, bodyTemplate: Record<string, unknown>, execute: WebserverResourceAction["execute"], options: Omit<WebserverResourceAction, "bodyTemplate" | "execute" | "id" | "label" | "requiresSelection"> & { selection?: boolean } = {}): WebserverResourceAction { return { id, label, bodyTemplate, execute, ...options, requiresSelection: options.selection }; }
function selectedId(context: WebserverResourceActionContext, key: string): string { const value = context.selectedItem?.[key]; if (typeof value !== "string" && typeof value !== "number") throw new Error(`${key} is unavailable`); return String(value); }
function idempotencyParams(context: WebserverResourceActionContext): { idempotencyKey: string } { const idempotencyKey = context.idempotencyKey?.trim(); if (!idempotencyKey) throw new Error("Idempotency key is required"); return { idempotencyKey }; }
function filterValue(filters: Readonly<Record<string, string>> | undefined, key: string): string | undefined { const value = filters?.[key]?.trim(); return value || undefined; }

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
      action("create", "Create config", { name: "", content: "", description: "" }, (context) => client.nginx.configs.create(context.body as unknown as Parameters<typeof client.nginx.configs.create>[0])),
      action("update", "Update", { name: "", content: "", description: "" }, (context) => client.nginx.configs.update(selectedId(context, "configId"), context.body as unknown as Parameters<typeof client.nginx.configs.update>[1]), { selection: true }),
      action("validate", "Validate", {}, (context) => client.nginx.configs.validate(selectedId(context, "configId")), { selection: true }),
      action("deploy", "Deploy", {}, (context) => client.nginx.configs.deploy(selectedId(context, "configId")), { dangerous: true, selection: true }),
      action("reload", "Reload runtime", {}, () => client.nginx.reload.create(), { dangerous: true }),
    ]),
    servers: source((query) => client.server.list({ page: query.page, pageSize: query.pageSize }), [
      action("create", "Register server", { name: "", host: "", port: 443, protocol: "https" }, (context) => client.server.create(context.body as unknown as Parameters<typeof client.server.create>[0])),
    ]),
    diagnostics: source(async () => client.nginx.status.retrieve(), [action("reload", "Reload runtime", {}, () => client.nginx.reload.create(), { dangerous: true })]),
    audit: source((query) => client.audit.auditLogs.list({ page: query.page, pageSize: query.pageSize }), []),
  };
}

function source(load: WebserverResourceDataSource["load"] extends (query: infer Q) => Promise<unknown> ? (query: Q) => Promise<unknown> : never, actions: readonly WebserverResourceAction[]): WebserverResourceDataSource { return { actions, async load(query) { return normalizeWebserverPage(await load(query)); } }; }
function action(id: string, label: string, bodyTemplate: Record<string, unknown>, execute: WebserverResourceAction["execute"], options: { dangerous?: boolean; selection?: boolean } = {}): WebserverResourceAction { return { id, label, bodyTemplate, execute, dangerous: options.dangerous, requiresSelection: options.selection }; }
function selectedId(context: WebserverResourceActionContext, key: string): string { const value = context.selectedItem?.[key]; if (typeof value !== "string" && typeof value !== "number") throw new Error(`${key} is unavailable`); return String(value); }


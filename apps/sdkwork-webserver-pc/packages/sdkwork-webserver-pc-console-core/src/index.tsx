import { normalizeWebserverPage, type WebserverResourceAction, type WebserverResourceActionContext, type WebserverResourceDataSource, type WebserverResourceRegistry } from "@sdkwork/webserver-pc-commons";
import { createClient, type SdkworkAppClient } from "@sdkwork/web-app-sdk";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import { createContext, useContext, type ReactNode } from "react";

export type WebserverConsoleSdkClient = SdkworkAppClient;
const Context = createContext<WebserverConsoleSdkClient | null>(null);

export function createWebserverConsoleSdkClient(baseUrl: string, tokenManager: AuthTokenManager): WebserverConsoleSdkClient { return createClient({ baseUrl, authMode: "dual-token", platform: "pc", tokenManager }); }
export function WebserverConsoleSdkProvider({ children, client }: { children: ReactNode; client: WebserverConsoleSdkClient }) { return <Context.Provider value={client}>{children}</Context.Provider>; }
export function useWebserverConsoleSdk(): WebserverConsoleSdkClient { const client = useContext(Context); if (!client) throw new Error("WebserverConsoleSdkProvider is required"); return client; }

export function createWebserverConsoleRegistry(client: WebserverConsoleSdkClient): WebserverResourceRegistry {
  return {
    sites: source((query) => client.site.list({ page: query.page, pageSize: query.pageSize, keyword: query.search }), [
      action("create", "Create site", { name: "", domain: "", siteType: 1 }, (context) => client.site.create(context.body as unknown as Parameters<typeof client.site.create>[0])),
      action("update", "Update", { name: "", description: "" }, (context) => client.site.update(selectedId(context, "siteId"), context.body as unknown as Parameters<typeof client.site.update>[1]), { selection: true }),
      action("activate", "Activate", {}, (context) => client.site.activate(selectedId(context, "siteId")), { selection: true }),
      action("pause", "Disable", {}, (context) => client.site.pause(selectedId(context, "siteId")), { dangerous: true, selection: true }),
      action("delete", "Delete", {}, (context) => client.site.delete(selectedId(context, "siteId")), { dangerous: true, selection: true }),
    ]),
    configuration: scopedSource((query) => client.envVariable.sites.envVariables.list(requiredScope(query.scopeId)), [
      action("create-variable", "Add variable", { key: "", value: "", environment: "production", secret: false }, (context) => client.envVariable.sites.envVariables.create(requiredScope(context.scopeId), context.body as unknown as Parameters<typeof client.envVariable.sites.envVariables.create>[1]), { scope: true }),
      action("create-check", "Add health check", { name: "", path: "/health", intervalSeconds: 30, timeoutSeconds: 5 }, (context) => client.monitor.sites.healthChecks.create(requiredScope(context.scopeId), context.body as unknown as Parameters<typeof client.monitor.sites.healthChecks.create>[1]), { scope: true }),
    ]),
    domains: scopedSource((query) => client.domain.sites.domains.list(requiredScope(query.scopeId), { page: query.page, pageSize: query.pageSize }), [
      action("create", "Bind domain", { domain: "", primary: false }, (context) => client.domain.sites.domains.create(requiredScope(context.scopeId), context.body as unknown as Parameters<typeof client.domain.sites.domains.create>[1]), { scope: true }),
      action("verify", "Verify", {}, (context) => client.domain.sites.domains.verify(requiredScope(context.scopeId), selectedId(context, "domainId")), { scope: true, selection: true }),
      action("delete", "Unbind", {}, (context) => client.domain.sites.domains.delete(requiredScope(context.scopeId), selectedId(context, "domainId")), { dangerous: true, scope: true, selection: true }),
    ]),
    certificates: source((query) => client.certificate.list({ page: query.page, pageSize: query.pageSize }), [
      action("create", "Request certificate", { domain: "", provider: "letsencrypt", autoRenew: true }, (context) => client.certificate.create(context.body as unknown as Parameters<typeof client.certificate.create>[0])),
    ]),
    deployments: scopedSource((query) => client.deployment.sites.deployments.list(requiredScope(query.scopeId), { page: query.page, pageSize: query.pageSize }), [
      action("deploy", "Deploy", { artifactId: "", environment: "production" }, (context) => client.deployment.sites.deployments.create(requiredScope(context.scopeId), context.body as unknown as Parameters<typeof client.deployment.sites.deployments.create>[1]), { scope: true }),
      action("rollback", "Rollback", {}, (context) => client.deployment.sites.deployments.rollback(requiredScope(context.scopeId), selectedId(context, "deploymentId")), { dangerous: true, scope: true, selection: true }),
    ]),
  };
}

function source(load: WebserverResourceDataSource["load"] extends (query: infer Q) => Promise<unknown> ? (query: Q) => Promise<unknown> : never, actions: readonly WebserverResourceAction[]): WebserverResourceDataSource { return { actions, async load(query) { return normalizeWebserverPage(await load(query)); } }; }
function scopedSource(load: Parameters<typeof source>[0], actions: readonly WebserverResourceAction[]): WebserverResourceDataSource { return { ...source(load, actions), requiresScope: true }; }
function action(id: string, label: string, bodyTemplate: Record<string, unknown>, execute: WebserverResourceAction["execute"], options: { dangerous?: boolean; scope?: boolean; selection?: boolean } = {}): WebserverResourceAction { return { id, label, bodyTemplate, execute, dangerous: options.dangerous, requiresScope: options.scope, requiresSelection: options.selection }; }
function selectedId(context: WebserverResourceActionContext, key: string): string { const value = context.selectedItem?.[key]; if (typeof value !== "string" && typeof value !== "number") throw new Error(`${key} is unavailable`); return String(value); }
function requiredScope(value: string | undefined): string { if (!value?.trim()) throw new Error("Site ID is required"); return value.trim(); }

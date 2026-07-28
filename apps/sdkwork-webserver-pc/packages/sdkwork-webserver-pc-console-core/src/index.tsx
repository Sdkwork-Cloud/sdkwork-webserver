import { normalizeWebserverPage, type WebserverResourceAction, type WebserverResourceActionContext, type WebserverResourceDataSource, type WebserverResourceRegistry } from "@sdkwork/webserver-pc-commons";
import { createDriveAppClient, type SdkworkDriveAppClient } from "@sdkwork/drive-app-sdk";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import { createClient as createWebAppClient, type SdkworkAppClient as SdkworkWebAppClient } from "@sdkwork/web-app-sdk";
import { createContext, useContext, type ReactNode } from "react";

export type WebserverConsoleSdkClient = SdkworkWebAppClient;

export interface WebserverConsoleSdkClients {
  drive: SdkworkDriveAppClient;
  web: SdkworkWebAppClient;
}

const Context = createContext<WebserverConsoleSdkClients | null>(null);

export function createWebserverConsoleSdkClient(baseUrl: string, tokenManager: AuthTokenManager): WebserverConsoleSdkClient { return createWebAppClient({ baseUrl, authMode: "dual-token", platform: "pc", tokenManager }); }
export function createWebserverConsoleSdkClients(baseUrls: { driveAppApiBaseUrl: string; webAppApiBaseUrl: string }, tokenManager: AuthTokenManager): WebserverConsoleSdkClients { return { drive: createDriveAppClient({ baseUrl: baseUrls.driveAppApiBaseUrl, authMode: "dual-token", platform: "pc", tokenManager }), web: createWebserverConsoleSdkClient(baseUrls.webAppApiBaseUrl, tokenManager) }; }
export function WebserverConsoleSdkProvider({ children, clients }: { children: ReactNode; clients: WebserverConsoleSdkClients }) { return <Context.Provider value={clients}>{children}</Context.Provider>; }
export function useWebserverConsoleSdk(): WebserverConsoleSdkClients { const clients = useContext(Context); if (!clients) throw new Error("WebserverConsoleSdkProvider is required"); return clients; }

export function createWebserverConsoleRegistry(clients: WebserverConsoleSdkClients): WebserverResourceRegistry {
  const client = clients.web;
  return {
    sites: source((query) => client.site.list({ page: query.page, pageSize: query.pageSize, keyword: query.search }), [
      action("create", "Create site", { name: "", applicationType: "WEB", siteType: 1 }, (context) => client.site.create(context.body as unknown as Parameters<typeof client.site.create>[0], idempotencyParams(context)), { fieldOptions: { applicationType: ["WEB", "API"], siteType: [1, 2, 3, 4, 5, 6] }, permission: "web.sites.write" }),
      action("update", "Update", { name: "", description: "" }, (context) => client.site.update(selectedId(context, "siteId"), context.body as unknown as Parameters<typeof client.site.update>[1]), { permission: "web.sites.write", selection: true }),
      action("activate", "Activate", {}, (context) => client.site.activate(selectedId(context, "siteId")), { permission: "web.sites.write", selection: true }),
      action("pause", "Disable", {}, (context) => client.site.pause(selectedId(context, "siteId")), { dangerous: true, permission: "web.sites.write", selection: true }),
      action("delete", "Delete", {}, (context) => client.site.delete(selectedId(context, "siteId")), { dangerous: true, permission: "web.sites.write", selection: true }),
    ]),
    configuration: scopedSource((query) => client.envVariable.sites.envVariables.list(requiredScope(query.scopeId)), [
      action("create-variable", "Add variable", { key: "", value: "", environment: "production", isSecret: false }, (context) => client.envVariable.sites.envVariables.create(requiredScope(context.scopeId), context.body as unknown as Parameters<typeof client.envVariable.sites.envVariables.create>[1], idempotencyParams(context)), { permission: "web.sites.write", scope: true }),
      action("create-check", "Add health check", { checkType: 1, checkUrl: "/health", checkInterval: 30, timeoutMs: 5_000, retryCount: 3 }, (context) => client.monitor.sites.healthChecks.create(requiredScope(context.scopeId), context.body as unknown as Parameters<typeof client.monitor.sites.healthChecks.create>[1], idempotencyParams(context)), { fieldOptions: { checkType: [1, 2, 3] }, permission: "web.sites.write", scope: true }),
    ]),
    domains: scopedSource((query) => client.domain.sites.domains.list(requiredScope(query.scopeId), { page: query.page, pageSize: query.pageSize }), [
      action("create", "Bind domain", { hostname: "", isPrimary: false, sslEnabled: true, sslProvider: "letsencrypt" }, (context) => client.domain.sites.domains.create(requiredScope(context.scopeId), context.body as unknown as Parameters<typeof client.domain.sites.domains.create>[1], idempotencyParams(context)), { fieldOptions: { sslProvider: ["letsencrypt", "custom", "none"] }, permission: "web.sites.write", scope: true }),
      action("verify", "Verify", {}, (context) => client.domain.sites.domains.verify(requiredScope(context.scopeId), selectedId(context, "domainId"), idempotencyParams(context)), { permission: "web.sites.write", scope: true, selection: true }),
      action("delete", "Unbind", {}, (context) => client.domain.sites.domains.delete(requiredScope(context.scopeId), selectedId(context, "domainId")), { dangerous: true, permission: "web.sites.write", scope: true, selection: true }),
    ]),
    certificates: scopedSource((query) => client.certificate.list({ page: query.page, pageSize: query.pageSize, siteId: requiredScope(query.scopeId) }), [
      action("create", "Request certificate", { domainId: "", certType: 1, autoRenew: true }, (context) => client.certificate.create(context.body as unknown as Parameters<typeof client.certificate.create>[0], idempotencyParams(context)), {
        fieldOptions: { certType: [1, 3], domainId: [] },
        loadFieldOptions: async (context) => {
          const result = await client.domain.sites.domains.list(requiredScope(context.scopeId), { page: 1, pageSize: 100 });
          return {
            domainId: result.items.flatMap((domain) => typeof domain.id === "string"
              ? [{ value: domain.id, label: domain.hostname || domain.id }]
              : []),
          };
        },
        permission: "web.certificates.write",
        scope: true,
      }),
    ]),
    deployments: scopedSource((query) => client.deployment.sites.deployments.list(requiredScope(query.scopeId), { page: query.page, pageSize: query.pageSize }), [
      action("deploy", "Deploy", { deployType: 1, environment: "production", versionTag: "", sourceRef: "", commitHash: "" }, (context) => deployApplication(clients, context), {
        acceptedFileTypes: ".zip,.tar,.tar.gz,.tgz,.gz",
        confirmation: true,
        fieldOptions: { deployType: [1], environment: ["production", "staging", "test", "development"] },
        file: true,
        permission: "web.sites.write",
        scope: true,
      }),
      action("rollback", "Rollback", {}, (context) => client.deployment.sites.deployments.rollback(requiredScope(context.scopeId), selectedId(context, "deploymentId"), idempotencyParams(context)), {
        availableWhen: (context) => Number(context.selectedItem?.status) === 2,
        dangerous: true,
        permission: "web.sites.write",
        scope: true,
        selection: true,
      }),
    ]),
  };
}

function source(load: WebserverResourceDataSource["load"] extends (query: infer Q) => Promise<unknown> ? (query: Q) => Promise<unknown> : never, actions: readonly WebserverResourceAction[]): WebserverResourceDataSource { return { actions, async load(query) { return normalizeWebserverPage(await load(query)); } }; }
function scopedSource(load: Parameters<typeof source>[0], actions: readonly WebserverResourceAction[]): WebserverResourceDataSource { return { ...source(load, actions), requiresScope: true }; }
function action(id: string, label: string, bodyTemplate: Record<string, unknown>, execute: WebserverResourceAction["execute"], options: { acceptedFileTypes?: string; availableWhen?: WebserverResourceAction["availableWhen"]; confirmation?: boolean; dangerous?: boolean; fieldOptions?: WebserverResourceAction["fieldOptions"]; file?: boolean; loadFieldOptions?: WebserverResourceAction["loadFieldOptions"]; permission?: string; scope?: boolean; selection?: boolean } = {}): WebserverResourceAction { return { id, label, bodyTemplate, execute, acceptedFileTypes: options.acceptedFileTypes, availableWhen: options.availableWhen, dangerous: options.dangerous, fieldOptions: options.fieldOptions, loadFieldOptions: options.loadFieldOptions, permission: options.permission, requiresConfirmation: options.confirmation, requiresFile: options.file, requiresScope: options.scope, requiresSelection: options.selection }; }
function selectedId(context: WebserverResourceActionContext, key: string): string { const value = context.selectedItem?.[key]; if (typeof value !== "string" && typeof value !== "number") throw new Error(`${key} is unavailable`); return String(value); }
function requiredScope(value: string | undefined): string { if (!value?.trim()) throw new Error("Site ID is required"); return value.trim(); }
function idempotencyParams(context: WebserverResourceActionContext): { idempotencyKey: string } { const idempotencyKey = context.idempotencyKey?.trim(); if (!idempotencyKey) throw new Error("Idempotency key is required"); return { idempotencyKey }; }

async function deployApplication(clients: WebserverConsoleSdkClients, context: WebserverResourceActionContext): Promise<unknown> {
  const siteId = requiredScope(context.scopeId);
  const file = context.file;
  if (!file || file.size <= 0) throw new Error("A non-empty application package is required");

  context.onProgress?.(1);
  const artifactHash = await sha256Hex(file);
  context.onProgress?.(5);
  const uploaded = await clients.drive.uploader.uploadArchive({
    appResourceId: siteId,
    appResourceType: "web.deployment",
    checksumSha256Hex: `sha256:${artifactHash}`,
    contentType: file.type || "application/octet-stream",
    file,
    onProgress: (progress) => {
      const ratio = progress.totalBytes > 0 ? progress.uploadedBytes / progress.totalBytes : 0;
      context.onProgress?.(5 + Math.round(ratio * 88));
    },
    originalFileName: file.name,
    scene: "application-deployment",
    source: "sdkwork-webserver-pc",
  });
  context.onProgress?.(95);

  const deployType = Number(context.body.deployType);
  if (![1, 2, 3, 4].includes(deployType)) throw new Error("deployType is invalid");
  const request: Parameters<typeof clients.web.deployment.sites.deployments.create>[1] = {
    deployType: deployType as 1 | 2 | 3 | 4,
    environment: optionalText(context.body.environment),
    versionTag: optionalText(context.body.versionTag),
    sourceRef: optionalText(context.body.sourceRef),
    commitHash: optionalText(context.body.commitHash),
    artifactDriveUri: `drive://spaces/${uploaded.uploadSession.spaceId}/nodes/${uploaded.uploadSession.nodeId}`,
    artifactSize: String(file.size),
    artifactHash,
  };
  const deployment = await clients.web.deployment.sites.deployments.create(siteId, request, idempotencyParams(context));
  context.onProgress?.(100);
  return deployment;
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

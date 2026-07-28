import { createWebserverAdminApplicationRegistry } from "@sdkwork/webserver-pc-admin-applications";
import { createWebserverAdminCertificateRegistry } from "@sdkwork/webserver-pc-admin-certificates";
import { createWebserverAdminRegistry, type WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import type { ApplicationSourceStorage } from "@sdkwork/webserver-pc-commons";
import { describe, expect, it, vi } from "vitest";

describe("admin application capability", () => {
  it("uses generated application SDK namespaces for scoped workflows", async () => {
    const listApplications = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const createApplication = vi.fn().mockResolvedValue({ id: "app-1" });
    const updateApplication = vi.fn().mockResolvedValue({ id: "app-1" });
    const activateApplication = vi.fn().mockResolvedValue({ id: "app-1", status: 1 });
    const pauseApplication = vi.fn().mockResolvedValue({ id: "app-1", status: 2 });
    const deleteApplication = vi.fn().mockResolvedValue(undefined);
    const listDomains = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const createDomain = vi.fn().mockResolvedValue({ id: "domain-1" });
    const verifyDomain = vi.fn().mockResolvedValue({ verified: true });
    const deleteDomain = vi.fn().mockResolvedValue(undefined);
    const listDeployments = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1" });
    const rollbackDeployment = vi.fn().mockResolvedValue({ id: "rollback-1", status: 0 });
    const client = {
      application: {
        list: listApplications,
        create: createApplication,
        update: updateApplication,
        activate: activateApplication,
        pause: pauseApplication,
        delete: deleteApplication,
      },
      applicationDomain: { applications: { domains: { list: listDomains, create: createDomain, verify: verifyDomain, delete: deleteDomain } } },
      applicationDeployment: { applications: { deployments: { list: listDeployments, create: createDeployment, rollback: rollbackDeployment } } },
    } as unknown as WebserverAdminSdkClient;

    const sourceStorage = testSourceStorage();
    const sourceArchive = new File(["source"], "source.zip", { type: "application/zip" });
    const registry = createWebserverAdminApplicationRegistry(client, sourceStorage);
    await registry.applications?.load({ page: 1, pageSize: 20, search: "api" });
    await registry.applications?.actions[0]?.execute({
      body: { name: "API", applicationType: "API", siteType: 6, environment: "production", versionTag: "v1.0.0" },
      files: [sourceArchive],
      idempotencyKey: "application-create-1",
      sourceInputMode: "archive",
    });
    expect(listApplications).toHaveBeenCalledWith({ page: 1, pageSize: 20, keyword: "api" });
    expect(createApplication).toHaveBeenCalledWith(expect.objectContaining({ name: "API", applicationType: "API", siteType: 6 }), { idempotencyKey: "application-create-1" });
    expect(sourceStorage.store).toHaveBeenCalledWith(expect.objectContaining({ applicationId: "app-1" }));
    createDeployment.mockClear();

    const applicationActions = registry.applications?.actions ?? [];
    await applicationActions.find((candidate) => candidate.id === "update")?.execute({ body: { name: "Renamed", description: "API" }, idempotencyKey: "application-update-1", selectedItem: { id: "app-1" } });
    await applicationActions.find((candidate) => candidate.id === "activate")?.execute({ body: {}, idempotencyKey: "application-activate-1", selectedItem: { id: "app-1", status: 0 } });
    await applicationActions.find((candidate) => candidate.id === "pause")?.execute({ body: {}, idempotencyKey: "application-pause-1", selectedItem: { id: "app-1", status: 1 } });
    await applicationActions.find((candidate) => candidate.id === "delete")?.execute({ body: {}, idempotencyKey: "application-delete-1", selectedItem: { id: "app-1", status: 2 } });
    expect(updateApplication).toHaveBeenCalledWith("app-1", { name: "Renamed", description: "API" }, { idempotencyKey: "application-update-1" });
    expect(activateApplication).toHaveBeenCalledWith("app-1", { idempotencyKey: "application-activate-1" });
    expect(pauseApplication).toHaveBeenCalledWith("app-1", { idempotencyKey: "application-pause-1" });
    expect(deleteApplication).toHaveBeenCalledWith("app-1", { idempotencyKey: "application-delete-1" });
    expect(applicationActions.find((candidate) => candidate.id === "activate")?.availableWhen?.({ body: {}, selectedItem: { status: 1 } })).toBe(false);
    expect(applicationActions.find((candidate) => candidate.id === "pause")?.availableWhen?.({ body: {}, selectedItem: { status: 1 } })).toBe(true);
    expect(applicationActions.find((candidate) => candidate.id === "delete")?.dangerous).toBe(true);

    expect(registry["application-domains"]?.scopeKind).toBe("application");
    await registry["application-domains"]?.load({ page: 1, pageSize: 20, scopeId: "app-1" });
    await registry["application-domains"]?.actions[0]?.execute({ scopeId: "app-1", body: { hostname: "api.example.test" }, idempotencyKey: "domain-create-1" });
    await registry["application-domains"]?.actions[1]?.execute({ scopeId: "app-1", body: {}, idempotencyKey: "domain-verify-1", selectedItem: { id: "domain-1" } });
    await registry["application-domains"]?.actions.find((candidate) => candidate.id === "delete")?.execute({ scopeId: "app-1", body: {}, idempotencyKey: "domain-delete-1", selectedItem: { id: "domain-1" } });
    expect(listDomains).toHaveBeenCalledWith("app-1", { page: 1, pageSize: 20 });
    expect(createDomain).toHaveBeenCalledWith("app-1", { hostname: "api.example.test" }, { idempotencyKey: "domain-create-1" });
    expect(verifyDomain).toHaveBeenCalledWith("app-1", "domain-1", { idempotencyKey: "domain-verify-1" });
    expect(deleteDomain).toHaveBeenCalledWith("app-1", "domain-1", { idempotencyKey: "domain-delete-1" });
    expect(registry["application-domains"]?.actions.find((candidate) => candidate.id === "verify")?.availableWhen?.({ body: {}, selectedItem: { isVerified: true } })).toBe(false);

    const deploymentBody = {
      deployType: 1,
      environment: "production",
      versionTag: "v1.1.0",
    };
    await registry["application-deployments"]?.actions[0]?.execute({
      scopeId: "app-1",
      body: deploymentBody,
      files: [sourceArchive],
      sourceInputMode: "archive",
      idempotencyKey: "deployment-create-1",
    });
    await registry["application-deployments"]?.actions.find((candidate) => candidate.id === "rollback")?.execute({ scopeId: "app-1", body: {}, idempotencyKey: "deployment-rollback-1", selectedItem: { id: "deployment-1", status: 2 } });
    expect(createDeployment).toHaveBeenCalledWith("app-1", {
      ...deploymentBody,
      artifactDriveUri: "drive://spaces/releases/nodes/node-1",
      artifactSize: "6",
      artifactHash: "a".repeat(64),
      commitHash: undefined,
      sourceRef: undefined,
    }, { idempotencyKey: "deployment-create-1" });
    expect(rollbackDeployment).toHaveBeenCalledWith("app-1", "deployment-1", { idempotencyKey: "deployment-rollback-1" });
    expect(registry["application-deployments"]?.actions.find((candidate) => candidate.id === "rollback")?.availableWhen?.({ body: {}, selectedItem: { status: 3 } })).toBe(false);
  });

  it.each([
    [{ deployType: 0, environment: "production", versionTag: "v1.1.0" }, "Deployment method is invalid"],
    [{ deployType: 1, environment: "qa", versionTag: "v1.1.0" }, "Deployment environment is invalid"],
  ])("rejects invalid deployment metadata before admin source processing", async (body, message) => {
    const prepare = vi.fn();
    const store = vi.fn();
    const createDeployment = vi.fn();
    const sourceStorage: ApplicationSourceStorage = { prepare, store };
    const client = {
      applicationDeployment: {
        applications: { deployments: { create: createDeployment } },
      },
    } as unknown as WebserverAdminSdkClient;
    const registry = createWebserverAdminApplicationRegistry(client, sourceStorage);
    const deploy = registry["application-deployments"]?.actions.find(
      (candidate) => candidate.id === "deploy",
    );
    if (!deploy) throw new Error("admin deploy action is unavailable");

    await expect(deploy.execute({
      scopeId: "app-1",
      body,
      idempotencyKey: "invalid-admin-deployment",
    })).rejects.toThrow(message);
    expect(prepare).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
    expect(createDeployment).not.toHaveBeenCalled();
  });
});

function testSourceStorage(): ApplicationSourceStorage {
  return {
    prepare: vi.fn(async ({ files, mode }) => ({
      archive: files[0],
      archiveHash: "a".repeat(64),
      inputMode: mode,
      sourceFileCount: files.length,
      uncompressedSize: files[0].size,
    })),
    store: vi.fn().mockResolvedValue({
      archiveDriveUri: "drive://spaces/releases/nodes/node-1",
      archiveHash: "a".repeat(64),
      archiveSize: "6",
      extractedCount: "1",
    }),
  };
}

describe("admin certificate capability", () => {
  it("manages the canonical certificate and reads shared distribution state", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const create = vi.fn().mockResolvedValue({ id: "certificate-1" });
    const update = vi.fn().mockResolvedValue({ id: "certificate-1", autoRenew: false });
    const renew = vi.fn().mockResolvedValue({ id: "certificate-1" });
    const listDistribution = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const client = {
      certificate: { list, create, update, renew },
      certificateDistribution: { certificates: { distribution: { list: listDistribution } } },
    } as unknown as WebserverAdminSdkClient;

    const registry = createWebserverAdminCertificateRegistry(client);
    await registry["managed-certificates"]?.load({ page: 2, pageSize: 20 });
    await registry["managed-certificates"]?.actions[0]?.execute({ body: { domainId: "domain-1", certType: 1, autoRenew: true }, idempotencyKey: "certificate-create-1" });
    await registry["managed-certificates"]?.actions[1]?.execute({ body: { autoRenew: false }, idempotencyKey: "certificate-update-1", selectedItem: { id: "certificate-1" } });
    await registry["managed-certificates"]?.actions[2]?.execute({ body: {}, idempotencyKey: "certificate-renew-1", selectedItem: { id: "certificate-1" } });
    await registry["certificate-distribution"]?.load({ page: 1, pageSize: 20 });

    expect(list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(create).toHaveBeenCalledWith({ domainId: "domain-1", certType: 1, autoRenew: true }, { idempotencyKey: "certificate-create-1" });
    expect(update).toHaveBeenCalledWith("certificate-1", { autoRenew: false }, { idempotencyKey: "certificate-update-1" });
    expect(renew).toHaveBeenCalledWith("certificate-1", { idempotencyKey: "certificate-renew-1" });
    expect(listDistribution).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it("rejects unsupported certificate renewal policy before the backend SDK call", async () => {
    const create = vi.fn();
    const client = { certificate: { create } } as unknown as WebserverAdminSdkClient;
    const registry = createWebserverAdminCertificateRegistry(client);
    const issue = registry["managed-certificates"]?.actions.find((candidate) => candidate.id === "create");
    if (!issue) throw new Error("certificate issue action is unavailable");

    await expect(issue.execute({
      body: { domainId: "domain-1", certType: 3, autoRenew: true },
      idempotencyKey: "invalid-self-signed-renewal",
    })).rejects.toThrow("unavailable for self-signed certificates");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("admin control-plane capability", () => {
  it("uses canonical Nginx, server, and audit SDK contracts", async () => {
    const createConfig = vi.fn().mockResolvedValue({ id: "config-1" });
    const updateConfig = vi.fn().mockResolvedValue({ id: "config-1" });
    const createServer = vi.fn().mockResolvedValue({ id: "server-1", agentToken: "one-time-token" });
    const listAudit = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const client = {
      nginx: {
        configs: {
          list: vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
          create: createConfig,
          update: updateConfig,
          validate: vi.fn(),
          deploy: vi.fn(),
        },
        reload: { create: vi.fn() },
        status: { retrieve: vi.fn().mockResolvedValue({ status: "ok" }) },
      },
      server: {
        list: vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
        create: createServer,
      },
      audit: { auditLogs: { list: listAudit } },
    } as unknown as WebserverAdminSdkClient;
    const registry = createWebserverAdminRegistry(client);

    await registry.nginx?.actions.find((candidate) => candidate.id === "create")?.execute({ body: { siteId: "site-1", configType: 1, configName: "edge", configContent: "events {}" }, idempotencyKey: "config-create-1" });
    await registry.nginx?.actions.find((candidate) => candidate.id === "update")?.execute({ body: { configName: "edge-v2", configContent: "events {}" }, idempotencyKey: "config-update-1", selectedItem: { id: "config-1" } });
    expect(createConfig).toHaveBeenCalledWith({ siteId: "site-1", configType: 1, configName: "edge", configContent: "events {}" }, { idempotencyKey: "config-create-1" });
    expect(updateConfig).toHaveBeenCalledWith("config-1", { configName: "edge-v2", configContent: "events {}" }, { idempotencyKey: "config-update-1" });

    const register = registry.servers?.actions.find((candidate) => candidate.id === "create");
    const tenantScopeHash = "a".repeat(64);
    await register?.execute({ body: { name: "edge-1", host: "10.0.0.8", sshPort: 22, tenantScopeHash }, idempotencyKey: "server-create-1" });
    expect(register?.resultFields).toContain("agentToken");
    expect(createServer).toHaveBeenCalledWith({ name: "edge-1", host: "10.0.0.8", sshPort: 22, tenantScopeHash }, { idempotencyKey: "server-create-1" });

    await registry.audit?.load({
      filters: { targetType: "deployment", action: "sites.rollback", operatorId: "42", startDate: "2026-07-01", endDate: "2026-07-28" },
      page: 2,
      pageSize: 20,
    });
    expect(listAudit).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      targetType: "deployment",
      action: "sites.rollback",
      operatorId: "42",
      startDate: "2026-07-01",
      endDate: "2026-07-28",
    });
  });

  it("rejects invalid Nginx and server inputs before generated SDK calls", async () => {
    const createConfig = vi.fn();
    const createServer = vi.fn();
    const client = {
      nginx: { configs: { create: createConfig } },
      server: { create: createServer },
    } as unknown as WebserverAdminSdkClient;
    const registry = createWebserverAdminRegistry(client);
    const createNginx = registry.nginx?.actions.find((candidate) => candidate.id === "create");
    const registerServer = registry.servers?.actions.find((candidate) => candidate.id === "create");
    if (!createNginx || !registerServer) throw new Error("admin control-plane actions are unavailable");

    await expect(createNginx.execute({
      body: { configType: 1, configName: "edge", configContent: "events {}" },
      idempotencyKey: "invalid-nginx-site",
    })).rejects.toThrow("Site ID is required");
    await expect(createNginx.execute({
      body: { siteId: "site-1", configType: 1, configName: "edge", configContent: "x".repeat(1024 * 1024 + 1) },
      idempotencyKey: "oversized-nginx-config",
    })).rejects.toThrow("must not exceed 1 MiB");
    expect(createConfig).not.toHaveBeenCalled();

    await expect(registerServer.execute({
      body: { name: "edge-1", host: "10.0.0.8", sshPort: 0, tenantScopeHash: "a".repeat(64) },
      idempotencyKey: "invalid-server-port",
    })).rejects.toThrow("SSH port must be between 1 and 65535");
    await expect(registerServer.execute({
      body: { name: "edge-1", host: "10.0.0.8", sshPort: 22, tenantScopeHash: "tenant-hash" },
      idempotencyKey: "invalid-server-scope",
    })).rejects.toThrow("lowercase SHA-256 digest");
    expect(createServer).not.toHaveBeenCalled();
  });
});

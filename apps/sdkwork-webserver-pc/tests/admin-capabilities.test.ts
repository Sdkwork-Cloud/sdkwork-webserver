import { createWebserverAdminApplicationRegistry } from "@sdkwork/webserver-pc-admin-applications";
import { createWebserverAdminCertificateRegistry } from "@sdkwork/webserver-pc-admin-certificates";
import { createWebserverAdminRegistry, type WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
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

    const registry = createWebserverAdminApplicationRegistry(client);
    await registry.applications?.load({ page: 1, pageSize: 20, search: "api" });
    await registry.applications?.actions[0]?.execute({ body: { name: "API", applicationType: "API", siteType: 6 } });
    expect(listApplications).toHaveBeenCalledWith({ page: 1, pageSize: 20, keyword: "api" });
    expect(createApplication).toHaveBeenCalledWith({ name: "API", applicationType: "API", siteType: 6 });

    const applicationActions = registry.applications?.actions ?? [];
    await applicationActions.find((candidate) => candidate.id === "update")?.execute({ body: { name: "Renamed", description: "API" }, selectedItem: { id: "app-1" } });
    await applicationActions.find((candidate) => candidate.id === "activate")?.execute({ body: {}, selectedItem: { id: "app-1", status: 0 } });
    await applicationActions.find((candidate) => candidate.id === "pause")?.execute({ body: {}, selectedItem: { id: "app-1", status: 1 } });
    await applicationActions.find((candidate) => candidate.id === "delete")?.execute({ body: {}, selectedItem: { id: "app-1", status: 2 } });
    expect(updateApplication).toHaveBeenCalledWith("app-1", { name: "Renamed", description: "API" });
    expect(activateApplication).toHaveBeenCalledWith("app-1");
    expect(pauseApplication).toHaveBeenCalledWith("app-1");
    expect(deleteApplication).toHaveBeenCalledWith("app-1");
    expect(applicationActions.find((candidate) => candidate.id === "activate")?.availableWhen?.({ body: {}, selectedItem: { status: 1 } })).toBe(false);
    expect(applicationActions.find((candidate) => candidate.id === "pause")?.availableWhen?.({ body: {}, selectedItem: { status: 1 } })).toBe(true);
    expect(applicationActions.find((candidate) => candidate.id === "delete")?.dangerous).toBe(true);

    expect(registry["application-domains"]?.scopeKind).toBe("application");
    await registry["application-domains"]?.load({ page: 1, pageSize: 20, scopeId: "app-1" });
    await registry["application-domains"]?.actions[0]?.execute({ scopeId: "app-1", body: { hostname: "api.example.test" } });
    await registry["application-domains"]?.actions[1]?.execute({ scopeId: "app-1", body: {}, selectedItem: { id: "domain-1" } });
    await registry["application-domains"]?.actions.find((candidate) => candidate.id === "delete")?.execute({ scopeId: "app-1", body: {}, selectedItem: { id: "domain-1" } });
    expect(listDomains).toHaveBeenCalledWith("app-1", { page: 1, pageSize: 20 });
    expect(createDomain).toHaveBeenCalledWith("app-1", { hostname: "api.example.test" });
    expect(verifyDomain).toHaveBeenCalledWith("app-1", "domain-1");
    expect(deleteDomain).toHaveBeenCalledWith("app-1", "domain-1");
    expect(registry["application-domains"]?.actions.find((candidate) => candidate.id === "verify")?.availableWhen?.({ body: {}, selectedItem: { isVerified: true } })).toBe(false);

    const deploymentBody = {
      deployType: 1,
      environment: "production",
      artifactDriveUri: "drive://spaces/releases/nodes/node-1",
      artifactSize: "1024",
      artifactHash: "a".repeat(64),
    };
    await registry["application-deployments"]?.actions[0]?.execute({ scopeId: "app-1", body: deploymentBody });
    await registry["application-deployments"]?.actions.find((candidate) => candidate.id === "rollback")?.execute({ scopeId: "app-1", body: {}, selectedItem: { id: "deployment-1", status: 2 } });
    expect(createDeployment).toHaveBeenCalledWith("app-1", deploymentBody);
    expect(rollbackDeployment).toHaveBeenCalledWith("app-1", "deployment-1");
    expect(registry["application-deployments"]?.actions.find((candidate) => candidate.id === "rollback")?.availableWhen?.({ body: {}, selectedItem: { status: 3 } })).toBe(false);
  });
});

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
    await registry["managed-certificates"]?.actions[0]?.execute({ body: { domainId: "domain-1", certType: 1, autoRenew: true } });
    await registry["managed-certificates"]?.actions[1]?.execute({ body: { autoRenew: false }, selectedItem: { id: "certificate-1" } });
    await registry["managed-certificates"]?.actions[2]?.execute({ body: {}, selectedItem: { id: "certificate-1" } });
    await registry["certificate-distribution"]?.load({ page: 1, pageSize: 20 });

    expect(list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(create).toHaveBeenCalledWith({ domainId: "domain-1", certType: 1, autoRenew: true });
    expect(update).toHaveBeenCalledWith("certificate-1", { autoRenew: false });
    expect(renew).toHaveBeenCalledWith("certificate-1");
    expect(listDistribution).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
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

    await registry.nginx?.actions.find((candidate) => candidate.id === "create")?.execute({ body: { configType: 1, configName: "edge", configContent: "events {}" } });
    await registry.nginx?.actions.find((candidate) => candidate.id === "update")?.execute({ body: { configName: "edge-v2", configContent: "events {}" }, selectedItem: { id: "config-1" } });
    expect(createConfig).toHaveBeenCalledWith({ configType: 1, configName: "edge", configContent: "events {}" });
    expect(updateConfig).toHaveBeenCalledWith("config-1", { configName: "edge-v2", configContent: "events {}" });

    const register = registry.servers?.actions.find((candidate) => candidate.id === "create");
    await register?.execute({ body: { name: "edge-1", host: "10.0.0.8", sshPort: 22, tenantScopeHash: "tenant-hash" } });
    expect(register?.resultFields).toContain("agentToken");
    expect(createServer).toHaveBeenCalledWith({ name: "edge-1", host: "10.0.0.8", sshPort: 22, tenantScopeHash: "tenant-hash" });

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
});

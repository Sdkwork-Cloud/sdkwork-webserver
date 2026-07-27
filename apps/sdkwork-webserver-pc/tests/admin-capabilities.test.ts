import { createWebserverAdminApplicationRegistry } from "@sdkwork/webserver-pc-admin-applications";
import { createWebserverAdminCertificateRegistry } from "@sdkwork/webserver-pc-admin-certificates";
import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import { describe, expect, it, vi } from "vitest";

describe("admin application capability", () => {
  it("uses generated application SDK namespaces for scoped workflows", async () => {
    const listApplications = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const createApplication = vi.fn().mockResolvedValue({ id: "app-1" });
    const listDomains = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const createDomain = vi.fn().mockResolvedValue({ id: "domain-1" });
    const verifyDomain = vi.fn().mockResolvedValue({ verified: true });
    const listDeployments = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1" });
    const client = {
      application: { list: listApplications, create: createApplication },
      applicationDomain: { applications: { domains: { list: listDomains, create: createDomain, verify: verifyDomain } } },
      applicationDeployment: { applications: { deployments: { list: listDeployments, create: createDeployment } } },
    } as unknown as WebserverAdminSdkClient;

    const registry = createWebserverAdminApplicationRegistry(client);
    await registry.applications?.load({ page: 1, pageSize: 20, search: "api" });
    await registry.applications?.actions[0]?.execute({ body: { name: "API", applicationType: "API", siteType: 6 } });
    expect(listApplications).toHaveBeenCalledWith({ page: 1, pageSize: 20, keyword: "api" });
    expect(createApplication).toHaveBeenCalledWith({ name: "API", applicationType: "API", siteType: 6 });

    expect(registry["application-domains"]?.scopeKind).toBe("application");
    await registry["application-domains"]?.load({ page: 1, pageSize: 20, scopeId: "app-1" });
    await registry["application-domains"]?.actions[0]?.execute({ scopeId: "app-1", body: { hostname: "api.example.test" } });
    await registry["application-domains"]?.actions[1]?.execute({ scopeId: "app-1", body: {}, selectedItem: { id: "domain-1" } });
    expect(listDomains).toHaveBeenCalledWith("app-1", { page: 1, pageSize: 20 });
    expect(createDomain).toHaveBeenCalledWith("app-1", { hostname: "api.example.test" });
    expect(verifyDomain).toHaveBeenCalledWith("app-1", "domain-1");

    await registry["application-deployments"]?.actions[0]?.execute({ scopeId: "app-1", body: { deployType: 1, environment: "production" } });
    expect(createDeployment).toHaveBeenCalledWith("app-1", { deployType: 1, environment: "production" });
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

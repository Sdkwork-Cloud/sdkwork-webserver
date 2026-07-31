import { createWebserverAdminApplicationRegistry } from "@sdkwork/webserver-pc-admin-applications";
import { createWebserverAdminCertificateRegistry } from "@sdkwork/webserver-pc-admin-certificates";
import { createWebserverAdminRegistry, type WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import { createWebserverAdminDomainRegistry } from "@sdkwork/webserver-pc-admin-domains";
import type { ApplicationMediaStorage, ApplicationSourceStorage } from "@sdkwork/webserver-pc-commons";
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
    const listSourceVersions = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const createSourceVersion = vi.fn().mockResolvedValue({ id: "source-version-1", status: 1 });
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
      applicationSourceVersion: { applications: { sourceVersions: { list: listSourceVersions, create: createSourceVersion, gitImport: { create: vi.fn() } } } },
    } as unknown as WebserverAdminSdkClient;

    const sourceStorage = testSourceStorage();
    const sourceArchive = new File(["source"], "source.zip", { type: "application/zip" });
    const registry = createWebserverAdminApplicationRegistry(client, sourceStorage, testMediaStorage());
    await registry.applications?.load({ page: 1, pageSize: 20, search: "api" });
    await registry.applications?.actions[0]?.execute({
      body: {
        name: "API",
        applicationType: "API",
        siteType: 6,
        environment: "production",
        versionTag: "v1.0.0",
        sourceVersionRetentionLimit: 5,
        appConfigPath: "sdkwork.app.config.json",
        deploymentConfigPath: "etc/sdkwork.deployment.config.json",
        publicRoot: "dist",
        spaFallback: "index.html",
      },
      applicationSubmission: defaultApplicationSubmission(),
      files: [sourceArchive],
      idempotencyKey: "application-create-1",
      sourceInputMode: "archive",
    });
    expect(listApplications).toHaveBeenCalledWith({ page: 1, pageSize: 20, keyword: "api" });
    expect(createApplication).toHaveBeenCalledWith(expect.objectContaining({ name: "API", applicationType: "API", siteType: 6 }), { idempotencyKey: "application-create-1" });
    expect(sourceStorage.store).toHaveBeenCalledWith(expect.objectContaining({ applicationId: "app-1" }));
    expect(createSourceVersion).toHaveBeenCalledWith("app-1", expect.objectContaining({
      artifactDriveUri: "drive://spaces/releases/nodes/node-1",
      sourceType: "ARCHIVE",
      versionTag: "v1.0.0",
    }), { idempotencyKey: "application-create-1" });
    createDeployment.mockClear();

    const applicationActions = registry.applications?.actions ?? [];
    await applicationActions.find((candidate) => candidate.id === "update")?.execute({ applicationSubmission: defaultApplicationSubmission(), body: { name: "Renamed", description: "API" }, idempotencyKey: "application-update-1", selectedItem: { id: "app-1" } });
    await applicationActions.find((candidate) => candidate.id === "activate")?.execute({ body: {}, idempotencyKey: "application-activate-1", selectedItem: { id: "app-1", status: 0 } });
    await applicationActions.find((candidate) => candidate.id === "pause")?.execute({ body: {}, idempotencyKey: "application-pause-1", selectedItem: { id: "app-1", status: 1 } });
    await applicationActions.find((candidate) => candidate.id === "delete")?.execute({ body: {}, idempotencyKey: "application-delete-1", selectedItem: { id: "app-1", status: 2 } });
    expect(updateApplication).toHaveBeenLastCalledWith("app-1", expect.objectContaining({ name: "Renamed", description: "API", storeListing: expect.objectContaining({ icon: expect.any(Object) }) }), { idempotencyKey: "application-update-1" });
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
      sourceVersionId: "source-version-1",
      versionTag: "v1.1.0",
    };
    await registry["application-deployments"]?.actions[0]?.execute({
      scopeId: "app-1",
      body: deploymentBody,
      idempotencyKey: "deployment-create-1",
    });
    await registry["application-deployments"]?.actions.find((candidate) => candidate.id === "rollback")?.execute({ scopeId: "app-1", body: {}, idempotencyKey: "deployment-rollback-1", selectedItem: { id: "deployment-1", status: 2 } });
    expect(createDeployment).toHaveBeenCalledWith("app-1", {
      ...deploymentBody,
    }, { idempotencyKey: "deployment-create-1" });
    expect(rollbackDeployment).toHaveBeenCalledWith("app-1", "deployment-1", { idempotencyKey: "deployment-rollback-1" });
    expect(registry["application-deployments"]?.actions.find((candidate) => candidate.id === "rollback")?.availableWhen?.({ body: {}, selectedItem: { status: 3 } })).toBe(false);
  });

  it("imports Git source versions before publishing without storing a browser package", async () => {
    const prepare = vi.fn();
    const store = vi.fn();
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1" });
    const importGit = vi.fn()
      .mockResolvedValueOnce({ id: "source-git-1", status: 1 })
      .mockResolvedValueOnce({ id: "source-git-2", status: 1 });
    const sourceStorage: ApplicationSourceStorage = { prepare, store };
    const client = {
      application: {
        create: vi.fn().mockResolvedValue({ id: "app-1" }),
        update: vi.fn().mockResolvedValue({ id: "app-1" }),
      },
      applicationDeployment: {
        applications: { deployments: { create: createDeployment } },
      },
      applicationSourceVersion: {
        applications: { sourceVersions: { gitImport: { create: importGit } } },
      },
    } as unknown as WebserverAdminSdkClient;
    const registry = createWebserverAdminApplicationRegistry(client, sourceStorage, testMediaStorage());
    const create = registry.applications?.actions.find((candidate) => candidate.id === "create");
    const saveSource = registry["application-source-versions"]?.actions.find(
      (candidate) => candidate.id === "create",
    );
    const deploy = registry["application-deployments"]?.actions.find(
      (candidate) => candidate.id === "deploy",
    );
    if (!create || !saveSource || !deploy) throw new Error("Git source version actions are unavailable");

    expect(create.sourceInput).toBe("archive-directory-or-git");
    await create.execute({
      applicationSubmission: defaultApplicationSubmission(),
      body: {
        name: "Git portal",
        applicationType: "WEB",
        siteType: 1,
        environment: "production",
        versionTag: "v1.0.0",
        sourceVersionRetentionLimit: 5,
        appConfigPath: "sdkwork.app.config.json",
        deploymentConfigPath: "etc/sdkwork.deployment.config.json",
        publicRoot: "dist",
        spaFallback: "index.html",
      },
      idempotencyKey: "git-application-create-1",
      sourceInputMode: "git",
      sourceRepository: "  https://github.com/sdkwork/example.git  ",
    });
    expect(importGit).toHaveBeenLastCalledWith("app-1", {
      repositoryUrl: "https://github.com/sdkwork/example.git",
      versionTag: "v1.0.0",
    }, { idempotencyKey: "git-application-create-1" });
    expect(createDeployment).toHaveBeenLastCalledWith("app-1", {
      deployType: 1,
      environment: "production",
      sourceVersionId: "source-git-1",
      versionTag: "v1.0.0",
    }, { idempotencyKey: "git-application-create-1" });

    await saveSource.execute({
      body: { versionTag: "v1.1.0" },
      idempotencyKey: "git-application-deploy-1",
      scopeId: "app-1",
      sourceInputMode: "git",
      sourceRepository: "https://git.example.test/team/portal.git",
    });
    await deploy.execute({
      body: { deployType: 1, sourceVersionId: "source-git-2", environment: "staging", versionTag: "v1.1.0" },
      idempotencyKey: "git-application-release-1",
      scopeId: "app-1",
    });
    expect(createDeployment).toHaveBeenLastCalledWith("app-1", {
      deployType: 1,
      environment: "staging",
      sourceVersionId: "source-git-2",
      versionTag: "v1.1.0",
    }, { idempotencyKey: "git-application-release-1" });
    expect(prepare).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
  });

  it.each([
    [{ deployType: 0, sourceVersionId: "source-version-1", environment: "production", versionTag: "v1.1.0" }, "Deployment method is invalid"],
    [{ deployType: 1, sourceVersionId: "source-version-1", environment: "qa", versionTag: "v1.1.0" }, "Deployment environment is invalid"],
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
    const registry = createWebserverAdminApplicationRegistry(client, sourceStorage, testMediaStorage());
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
      configSnapshot: {
        appConfigDetected: true,
        appConfigPath: "sdkwork.app.config.json",
        deploymentConfigDetected: true,
        deploymentConfigPath: "etc/sdkwork.deployment.config.json",
      },
    }),
  };
}

function defaultApplicationSubmission() {
  return {
    coverMode: "remove" as const,
    iconMode: "default" as const,
    previewFiles: [],
    previewsMode: "remove" as const,
  };
}

function testMediaStorage(): ApplicationMediaStorage {
  return {
    createDefaultIcon: vi.fn().mockResolvedValue(new File(["icon"], "application-icon.png", { type: "image/png" })),
    store: vi.fn(async ({ altText, applicationId, file, role, sequence = 0 }) => {
      const nodeId = `${applicationId}-${role}-${sequence}`;
      return {
        id: nodeId,
        kind: "image" as const,
        source: "drive" as const,
        uri: `drive://spaces/releases/nodes/${nodeId}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: String(file.size),
        width: 1024,
        height: role === "cover" ? 500 : 1024,
        altText,
        metadata: { drive: { nodeId, spaceId: "releases" } },
      };
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
    await registry["managed-certificates"]?.actions[0]?.execute({ body: { domainIds: ["domain-1", "domain-2"], certType: 1, keyAlgorithm: "RSA", autoRenew: true }, idempotencyKey: "certificate-create-1" });
    await registry["managed-certificates"]?.actions[1]?.execute({ body: { autoRenew: false }, idempotencyKey: "certificate-update-1", selectedItem: { id: "certificate-1" } });
    await registry["managed-certificates"]?.actions[2]?.execute({ body: {}, idempotencyKey: "certificate-renew-1", selectedItem: { id: "certificate-1" } });
    await registry["certificate-distribution"]?.load({ page: 1, pageSize: 20 });

    expect(list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(create).toHaveBeenCalledWith({ domainIds: ["domain-1", "domain-2"], certType: 1, keyAlgorithm: "RSA", autoRenew: true }, { idempotencyKey: "certificate-create-1" });
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
      body: { domainIds: ["domain-1"], certType: 3, keyAlgorithm: "ECDSA", autoRenew: true },
      idempotencyKey: "invalid-self-signed-renewal",
    })).rejects.toThrow("unavailable for self-signed certificates");
    expect(create).not.toHaveBeenCalled();
  });

  it("loads domain choices with hostname and application labels", async () => {
    const listDomains = vi.fn().mockResolvedValue({
      items: [
        { id: "domain-1", hostname: "api.example.test", applicationName: "Public API" },
        { id: "domain-2", hostname: "ready.example.test" },
      ],
      pageInfo: { page: 1, pageSize: 100, hasMore: false },
    });
    const client = {
      certificate: { create: vi.fn() },
      domain: { list: listDomains },
    } as unknown as WebserverAdminSdkClient;
    const registry = createWebserverAdminCertificateRegistry(client);
    const issue = registry["managed-certificates"]?.actions.find((candidate) => candidate.id === "create");
    if (!issue?.loadFieldOptions) throw new Error("certificate domain selector is unavailable");

    const options = await issue.loadFieldOptions({ body: issue.bodyTemplate });
    expect(options.domainIds).toEqual([
      { label: "api.example.test - Public API", value: "domain-1" },
      { label: "ready.example.test - Unbound", value: "domain-2" },
    ]);
    expect(issue.multipleFields).toEqual(["domainIds"]);
    expect(listDomains).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
  });
});

describe("admin domain capability", () => {
  it("manages detached assets, explicit application bindings, and repeatable certificate issue", async () => {
    const listDomains = vi.fn().mockResolvedValue({
      items: [{ id: "domain-1", hostname: "api.example.test", certificateCount: "0" }],
      pageInfo: { page: 1, pageSize: 20, hasMore: false },
    });
    const createDomain = vi.fn().mockResolvedValue({ id: "domain-1" });
    const verifyDomain = vi.fn().mockResolvedValue({ verified: true });
    const bindDomain = vi.fn().mockResolvedValue({ id: "domain-1", applicationId: "app-1" });
    const unbindDomain = vi.fn().mockResolvedValue(undefined);
    const deleteDomain = vi.fn().mockResolvedValue(undefined);
    const issueCertificate = vi.fn().mockResolvedValue({ id: "certificate-1" });
    const listApplications = vi.fn().mockResolvedValue({
      items: [{ id: "app-1", name: "Public API", applicationType: "API" }],
      pageInfo: { page: 1, pageSize: 100, hasMore: false },
    });
    const client = {
      application: { list: listApplications },
      certificate: { create: issueCertificate },
      domain: {
        list: listDomains,
        create: createDomain,
        verify: verifyDomain,
        delete: deleteDomain,
        applicationBinding: { update: bindDomain, delete: unbindDomain },
      },
    } as unknown as WebserverAdminSdkClient;
    const registry = createWebserverAdminDomainRegistry(client);
    const source = registry["managed-domains"];
    if (!source) throw new Error("managed domain source is unavailable");

    await source.load({ page: 1, pageSize: 20 });
    expect(listDomains).toHaveBeenCalledWith({ page: 1, pageSize: 20 });

    const create = source.actions.find((candidate) => candidate.id === "create");
    if (!create?.loadFieldOptions) throw new Error("managed domain create action is unavailable");
    expect(await create.loadFieldOptions({ body: create.bodyTemplate })).toEqual({
      applicationId: [
        { label: "Unbound", value: "" },
        { label: "Public API - API", value: "app-1" },
      ],
    });
    await create.execute({
      body: { ...create.bodyTemplate, hostname: "Ready.Example.Test" },
      idempotencyKey: "domain-create-1",
    });
    expect(createDomain).toHaveBeenCalledWith({
      hostname: "ready.example.test",
      applicationId: undefined,
      isPrimary: false,
      sslEnabled: true,
      sslProvider: "letsencrypt",
    }, { idempotencyKey: "domain-create-1" });

    const verify = source.actions.find((candidate) => candidate.id === "verify");
    await verify?.execute({ body: {}, idempotencyKey: "domain-verify-1", selectedItem: { id: "domain-1" } });
    expect(verifyDomain).toHaveBeenCalledWith("domain-1", { idempotencyKey: "domain-verify-1" });
    expect(verify?.availableWhen?.({ body: {}, selectedItem: { isVerified: true } })).toBe(false);

    const bind = source.actions.find((candidate) => candidate.id === "bind");
    await bind?.execute({
      body: { applicationId: "app-1", isPrimary: true },
      idempotencyKey: "domain-bind-1",
      selectedItem: { id: "domain-1" },
    });
    expect(bindDomain).toHaveBeenCalledWith(
      "domain-1",
      { applicationId: "app-1", isPrimary: true },
      { idempotencyKey: "domain-bind-1" },
    );
    expect(bind?.availableWhen?.({ body: {}, selectedItem: { applicationId: "app-1" } })).toBe(false);

    const unbind = source.actions.find((candidate) => candidate.id === "unbind");
    await unbind?.execute({ body: {}, idempotencyKey: "domain-unbind-1", selectedItem: { id: "domain-1", applicationId: "app-1" } });
    expect(unbindDomain).toHaveBeenCalledWith("domain-1", { idempotencyKey: "domain-unbind-1" });
    expect(unbind?.requiresConfirmation).toBe(true);

    const issue = source.actions.find((candidate) => candidate.id === "issue-certificate");
    await issue?.execute({
      body: { certType: 1, keyAlgorithm: "ECDSA", autoRenew: true },
      idempotencyKey: "domain-certificate-1",
      selectedItem: { id: "domain-1" },
    });
    expect(issueCertificate).toHaveBeenCalledWith(
      { domainIds: ["domain-1"], certType: 1, keyAlgorithm: "ECDSA", autoRenew: true },
      { idempotencyKey: "domain-certificate-1" },
    );

    const remove = source.actions.find((candidate) => candidate.id === "delete");
    expect(remove?.availableWhen?.({ body: {}, selectedItem: { certificateCount: "1" } })).toBe(false);
    expect(remove?.availableWhen?.({ body: {}, selectedItem: { certificateCount: "0" } })).toBe(true);
    await remove?.execute({ body: {}, idempotencyKey: "domain-delete-1", selectedItem: { id: "domain-1" } });
    expect(deleteDomain).toHaveBeenCalledWith("domain-1", { idempotencyKey: "domain-delete-1" });
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

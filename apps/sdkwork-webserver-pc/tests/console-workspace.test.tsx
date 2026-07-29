// @vitest-environment jsdom

import {
  hasWebserverAdminAccess,
  hasPlatformSuperAdminAccess,
  hasWebserverSuperAdminAccess,
  WebserverWorkspace,
  type ApplicationMediaStorage,
  type ApplicationSourceStorage,
  type WebserverResourceRegistry,
} from "@sdkwork/webserver-pc-commons";
import { webserverModule as configurationModule } from "@sdkwork/webserver-pc-console-site-configuration";
import { webserverModule as deliveryModule } from "@sdkwork/webserver-pc-console-delivery";
import { webserverModule as deploymentsModule } from "@sdkwork/webserver-pc-console-deployments";
import { webserverModule as sitesModule } from "@sdkwork/webserver-pc-console-sites";
import {
  createApplicationSourceStorage,
  createWebserverConsoleRegistry,
  type WebserverConsoleSdkClients,
} from "@sdkwork/webserver-pc-console-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const consoleModules = [sitesModule, configurationModule, deliveryModule, deploymentsModule];
const appUserPermissionScope = ["web.sites.*", "web.certificates.*"];

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("console workspace access", () => {
  it.each([
    ["/console/sites", "My applications"],
    ["/console/configuration", "Configuration"],
    ["/console/domains", "Custom domains"],
    ["/console/certificates", "Certificates"],
    ["/console/deployments", "Deployment history"],
  ])("authorizes the app_user role for %s", (path, heading) => {
    renderWorkspace(path, {}, appUserPermissionScope);

    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    expect(document.querySelector(".page-header")).toBeNull();
    expect(screen.queryByText("This feature is not authorized")).toBeNull();
  });

  it("keeps the console shell and sign-out available for an app user", () => {
    const onSignOut = vi.fn();

    renderWorkspace("/console/sites", {}, appUserPermissionScope, onSignOut);

    expect(screen.getByRole("link", { name: "My applications" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Deployment history" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Portal" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Notification center" }).getAttribute("href")).toBe("/notifications");
    expect(screen.getByTitle("user@example.test account")).toBeTruthy();
    expect(screen.queryByText("This feature is not authorized")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("matches wildcard scopes and selects an owned application for deployment history", async () => {
    const listSites = vi.fn().mockResolvedValue({
      items: [{ id: "site-1", name: "Customer portal" }],
      pageInfo: { page: 1, pageSize: 100, hasMore: false },
    });
    const listDeployments = vi.fn().mockResolvedValue({
      items: [{ id: "deployment-1", status: 1 }],
      pageInfo: { page: 1, pageSize: 20, hasMore: false },
    });
    const registry: WebserverResourceRegistry = {
      sites: { actions: [], load: listSites },
      deployments: {
        actions: [],
        load: listDeployments,
        requiresScope: true,
        scopeKind: "site",
      },
    };

    renderWorkspace("/console/deployments", registry, ["web.sites.*"]);

    const selector = await screen.findByRole("combobox", { name: "My application" });
    expect((selector as HTMLSelectElement).value).toBe("site-1");
    await waitFor(() => expect(listDeployments).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      scopeId: "site-1",
      search: undefined,
    }));
    expect(await screen.findByText("deployment-1")).toBeTruthy();
  });
});

describe("console release controls", () => {
  it("uses App Store field shapes and enforces the shared description limits", async () => {
    const registry: WebserverResourceRegistry = {
      sites: {
        actions: [{
          id: "create",
          label: "Create application",
          applicationSubmission: "create",
          bodyTemplate: {
            shortDescription: "",
            fullDescription: "",
            releaseNotes: "",
          },
          execute: vi.fn().mockResolvedValue({}),
        }],
        async load(query) {
          return { items: [], pageInfo: { page: query.page, pageSize: query.pageSize, hasMore: false, total: 0 } };
        },
      },
    };

    renderWorkspace("/console/sites", registry, appUserPermissionScope);
    fireEvent.click(await screen.findByRole("button", { name: "Create application" }));
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Store listing test" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const shortDescriptionField = screen.getByText("Short description").closest("label");
    const fullDescriptionField = screen.getByText("Full description").closest("label");
    const releaseNotesField = screen.getByText("Release notes").closest("label");
    const shortDescriptionInput = shortDescriptionField?.querySelector("input");
    expect(shortDescriptionInput).toBeTruthy();
    expect(fullDescriptionField?.querySelector("textarea")).toBeTruthy();
    expect(releaseNotesField?.querySelector("textarea")).toBeTruthy();

    fireEvent.change(shortDescriptionInput!, { target: { value: "a".repeat(81) } });
    expect(shortDescriptionInput?.value).toHaveLength(80);
    expect(shortDescriptionField?.textContent).toContain("80 / 80");
  });

  it("creates an application, stores its source, and creates the initial deployment command", async () => {
    const createSite = vi.fn().mockResolvedValue({ id: "site-1", name: "Portal" });
    const uploadArchive = vi.fn().mockResolvedValue({
      uploadSession: { spaceId: "space-1", nodeId: "source-1" },
    });
    const listArchiveEntries = vi.fn().mockResolvedValue({
      items: [
        { path: "index.html", isDirectory: false, uncompressedSizeBytes: "6" },
        { path: "assets/app.js", isDirectory: false, uncompressedSizeBytes: "12" },
      ],
      pageInfo: { page: 1, pageSize: 2, hasMore: false },
    });
    const extract = vi.fn().mockResolvedValue({ extractedCount: "2", items: [] });
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1", status: 0 });
    const registry = createWebserverConsoleRegistry({
      drive: { drive: { archiveEntries: { extract, list: listArchiveEntries } }, uploader: { uploadArchive } },
      web: {
        site: { create: createSite, update: vi.fn().mockResolvedValue({ id: "site-1" }) },
        deployment: { sites: { deployments: { create: createDeployment } } },
      },
    } as unknown as WebserverConsoleSdkClients, undefined, testMediaStorage());
    const create = registry.sites?.actions.find((action) => action.id === "create");
    const source = new File(["source"], "source.zip", { type: "application/zip" });

    await create?.execute({
      applicationSubmission: defaultApplicationSubmission(),
      body: {
        name: "Portal",
        applicationType: "WEB",
        siteType: 1,
        environment: "production",
        versionTag: "v1.0.0",
      },
      files: [source],
      idempotencyKey: "create-portal-v1",
      sourceInputMode: "archive",
    });

    expect(createSite).toHaveBeenCalledWith(expect.objectContaining({
      name: "Portal",
      applicationType: "WEB",
      siteType: 1,
    }), { idempotencyKey: "create-portal-v1" });
    expect(uploadArchive).toHaveBeenCalledWith(expect.objectContaining({
      appResourceId: "site-1",
      appResourceType: "web.application.source",
      file: source,
    }));
    expect(extract).toHaveBeenCalledWith("source-1", { entryPaths: ["index.html", "assets/app.js"] });
    expect(createDeployment).toHaveBeenCalledWith("site-1", expect.objectContaining({
      artifactDriveUri: "drive://spaces/space-1/nodes/source-1",
      versionTag: "v1.0.0",
    }), { idempotencyKey: "create-portal-v1" });
    expect(createSite.mock.invocationCallOrder[0]).toBeLessThan(uploadArchive.mock.invocationCallOrder[0]);
    expect(uploadArchive.mock.invocationCallOrder[0]).toBeLessThan(createDeployment.mock.invocationCallOrder[0]);
  });

  it("presents deployment contract fields as localized product labels", async () => {
    const registry: WebserverResourceRegistry = {
      sites: {
        actions: [],
        load: vi.fn().mockResolvedValue({
          items: [{ id: "site-1", name: "客户门户" }],
          pageInfo: { page: 1, pageSize: 100, hasMore: false },
        }),
      },
      deployments: {
        actions: [{
          bodyTemplate: {
            deployType: 1,
            environment: "production",
            versionTag: "v1.2.3",
          },
          execute: vi.fn(),
          fieldOptions: {
            deployType: [1],
            environment: ["production", "staging", "test", "development"],
          },
          id: "deploy",
          label: "Deploy",
          requiresFile: true,
          requiresScope: true,
        }],
        load: vi.fn().mockResolvedValue({
          items: [{
            artifactDriveUri: "drive://spaces/space-1/nodes/release-v1-2-3",
            artifactSize: "5242880",
            completedAt: "2026-07-28T08:00:18Z",
            durationMs: "18000",
            environment: "production",
            id: "deployment-1",
            startedAt: "2026-07-28T08:00:00Z",
            status: 2,
            versionTag: "v1.2.3",
          }],
          pageInfo: { page: 1, pageSize: 20, hasMore: false },
        }),
        requiresScope: true,
        scopeKind: "site",
      },
    };

    renderWorkspace("/console/deployments", registry, ["web.sites.*"], vi.fn(), "zh-CN");

    expect(await screen.findByRole("columnheader", { name: "发布环境" })).toBeTruthy();
    expect(screen.getByText("生产环境")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "发布新版本" }));
    expect(screen.getByText("发布方式")).toBeTruthy();
    expect(screen.getByRole("option", { name: "手动上传" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Git" })).toBeNull();
    expect(screen.queryByLabelText("源码分支")).toBeNull();
    expect(screen.queryByLabelText("提交哈希")).toBeNull();
  });

  it("uploads an application package to Drive before creating a deployment", async () => {
    const uploadArchive = vi.fn().mockResolvedValue({
      uploadSession: { spaceId: "space-1", nodeId: "node-1" },
    });
    const listArchiveEntries = vi.fn().mockResolvedValue({
      items: [{ path: "index.html", isDirectory: false, uncompressedSizeBytes: "5" }],
      pageInfo: { page: 1, pageSize: 500, hasMore: false },
    });
    const extract = vi.fn().mockResolvedValue({ extractedCount: "1", items: [] });
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1", status: 0 });
    const registry = createWebserverConsoleRegistry({
      drive: { drive: { archiveEntries: { extract, list: listArchiveEntries } }, uploader: { uploadArchive } },
      web: {
        deployment: { sites: { deployments: { create: createDeployment } } },
      },
    } as unknown as WebserverConsoleSdkClients);
    const deploy = registry.deployments?.actions.find((action) => action.id === "deploy");
    const file = new File(["hello"], "release.zip", { type: "application/zip" });

    expect(deploy?.fieldOptions?.deployType).toEqual([1]);

    await deploy?.execute({
      body: { deployType: 1, environment: "production", versionTag: "v1.2.3" },
      file,
      idempotencyKey: "release-attempt-1",
      scopeId: "site-1",
    });

    expect(uploadArchive).toHaveBeenCalledWith(expect.objectContaining({
      appResourceId: "site-1",
      appResourceType: "web.application.source",
      checksumSha256Hex: "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      file,
      fileFingerprint: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      scene: "application-source",
      source: "sdkwork-webserver-pc",
      taskId: expect.stringMatching(/^web-source-[a-f0-9]{64}$/),
    }));
    expect(listArchiveEntries).toHaveBeenCalledWith("node-1");
    expect(extract).toHaveBeenCalledWith("node-1", { entryPaths: ["index.html"] });
    expect(createDeployment).toHaveBeenCalledWith("site-1", expect.objectContaining({
      artifactDriveUri: "drive://spaces/space-1/nodes/node-1",
      artifactHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      artifactSize: "5",
      deployType: 1,
      environment: "production",
      versionTag: "v1.2.3",
    }), { idempotencyKey: "release-attempt-1" });
  });

  it.each([
    [{ deployType: 0, environment: "production", versionTag: "v1.2.3" }, "deployType"],
    [{ deployType: 1, environment: "qa", versionTag: "v1.2.3" }, "environment"],
  ])("rejects an invalid deployment enum before processing source files", async (body, field) => {
    const prepare = vi.fn();
    const store = vi.fn();
    const createDeployment = vi.fn();
    const sourceStorage: ApplicationSourceStorage = { prepare, store };
    const registry = createWebserverConsoleRegistry({
      drive: {},
      web: {
        deployment: { sites: { deployments: { create: createDeployment } } },
      },
    } as unknown as WebserverConsoleSdkClients, sourceStorage);
    const deploy = registry.deployments?.actions.find((action) => action.id === "deploy");
    if (!deploy) throw new Error("deploy action is unavailable");

    await expect(deploy.execute({
      body,
      idempotencyKey: "invalid-release-attempt",
      scopeId: "site-1",
    })).rejects.toThrow(`${field} is invalid`);
    expect(prepare).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
    expect(createDeployment).not.toHaveBeenCalled();
  });

  it("fails closed before extraction when Drive returns an incomplete archive listing", async () => {
    const extract = vi.fn();
    const storage = createApplicationSourceStorage({
      drive: {
        archiveEntries: {
          extract,
          list: vi.fn().mockResolvedValue({
            items: [{ path: "index.html", isDirectory: false, uncompressedSizeBytes: "5" }],
            pageInfo: { page: 1, pageSize: 1, hasMore: true },
          }),
        },
      },
      uploader: {
        uploadArchive: vi.fn().mockResolvedValue({
          uploadSession: { spaceId: "space-1", nodeId: "node-1" },
        }),
      },
    } as unknown as WebserverConsoleSdkClients["drive"]);

    await expect(storage.store({
      applicationId: "site-1",
      package: preparedArchive(),
    })).rejects.toThrow("incomplete");
    expect(extract).not.toHaveBeenCalled();
  });

  it("does not continue to extraction when source storage is cancelled during archive inspection", async () => {
    const controller = new AbortController();
    const extract = vi.fn();
    const storage = createApplicationSourceStorage({
      drive: {
        archiveEntries: {
          extract,
          list: vi.fn().mockImplementation(async () => {
            controller.abort();
            return {
              items: [{ path: "index.html", isDirectory: false, uncompressedSizeBytes: "5" }],
              pageInfo: { page: 1, pageSize: 1, hasMore: false },
            };
          }),
        },
      },
      uploader: {
        uploadArchive: vi.fn().mockResolvedValue({
          uploadSession: { spaceId: "space-1", nodeId: "node-1" },
        }),
      },
    } as unknown as WebserverConsoleSdkClients["drive"]);

    await expect(storage.store({
      applicationId: "site-1",
      package: preparedArchive(),
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(extract).not.toHaveBeenCalled();
  });

  it("does not create a deployment when source storage is cancelled during extraction", async () => {
    const controller = new AbortController();
    const createDeployment = vi.fn();
    const registry = createWebserverConsoleRegistry({
      drive: {
        drive: {
          archiveEntries: {
            extract: vi.fn().mockImplementation(async () => {
              controller.abort();
              return { extractedCount: "1", items: [] };
            }),
            list: vi.fn().mockResolvedValue({
              items: [{ path: "index.html", isDirectory: false, uncompressedSizeBytes: "5" }],
              pageInfo: { page: 1, pageSize: 1, hasMore: false },
            }),
          },
        },
        uploader: {
          uploadArchive: vi.fn().mockResolvedValue({
            uploadSession: { spaceId: "space-1", nodeId: "node-1" },
          }),
        },
      },
      web: {
        deployment: { sites: { deployments: { create: createDeployment } } },
      },
    } as unknown as WebserverConsoleSdkClients);
    const deploy = registry.deployments?.actions.find((action) => action.id === "deploy");

    await expect(deploy?.execute({
      body: { deployType: 1, environment: "production", versionTag: "v1.2.3" },
      file: new File(["hello"], "release.zip", { type: "application/zip" }),
      idempotencyKey: "cancelled-release-attempt",
      scopeId: "site-1",
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(createDeployment).not.toHaveBeenCalled();
  });

  it("rejects a successful Drive response when the extracted file count is incomplete", async () => {
    const storage = createApplicationSourceStorage({
      drive: {
        archiveEntries: {
          extract: vi.fn().mockResolvedValue({ extractedCount: "1", items: [] }),
          list: vi.fn().mockResolvedValue({
            items: [
              { path: "index.html", isDirectory: false, uncompressedSizeBytes: "5" },
              { path: "app.js", isDirectory: false, uncompressedSizeBytes: "10" },
            ],
            pageInfo: { page: 1, pageSize: 2, hasMore: false },
          }),
        },
      },
      uploader: {
        uploadArchive: vi.fn().mockResolvedValue({
          uploadSession: { spaceId: "space-1", nodeId: "node-1" },
        }),
      },
    } as unknown as WebserverConsoleSdkClients["drive"]);

    await expect(storage.store({
      applicationId: "site-1",
      package: preparedArchive(),
    })).rejects.toThrow("every validated");
  });

  it("scopes certificate listing and domain choices to the selected application", async () => {
    const listCertificates = vi.fn().mockResolvedValue({
      items: [],
      pageInfo: { page: 1, pageSize: 20, hasMore: false },
    });
    const listDomains = vi.fn().mockResolvedValue({
      items: [{ id: "domain-1", hostname: "app.example.com" }],
      pageInfo: { page: 1, pageSize: 100, hasMore: false },
    });
    const registry = createWebserverConsoleRegistry({
      drive: {},
      web: {
        certificate: { list: listCertificates },
        domain: { sites: { domains: { list: listDomains } } },
      },
    } as unknown as WebserverConsoleSdkClients);

    await registry.certificates?.load({ page: 1, pageSize: 20, scopeId: "site-1" });
    const options = await registry.certificates?.actions[0]?.loadFieldOptions?.({
      body: {},
      scopeId: "site-1",
    });

    expect(listCertificates).toHaveBeenCalledWith({ page: 1, pageSize: 20, siteId: "site-1" });
    expect(listDomains).toHaveBeenCalledWith("site-1", { page: 1, pageSize: 100 });
    expect(options?.domainId).toEqual([{ value: "domain-1", label: "app.example.com" }]);
    expect(registry.certificates?.actions[0]?.fieldOptions?.certType).toEqual([1, 3]);
  });

  it("rejects invalid configuration inputs before app SDK calls", async () => {
    const createVariable = vi.fn();
    const createHealthCheck = vi.fn();
    const createDomain = vi.fn();
    const createCertificate = vi.fn();
    const registry = createWebserverConsoleRegistry({
      drive: {},
      web: {
        envVariable: { sites: { envVariables: { create: createVariable } } },
        monitor: { sites: { healthChecks: { create: createHealthCheck } } },
        domain: { sites: { domains: { create: createDomain } } },
        certificate: { create: createCertificate },
      },
    } as unknown as WebserverConsoleSdkClients);
    const variable = registry.configuration?.actions.find((candidate) => candidate.id === "create-variable");
    const healthCheck = registry.configuration?.actions.find((candidate) => candidate.id === "create-check");
    const domain = registry.domains?.actions.find((candidate) => candidate.id === "create");
    const certificate = registry.certificates?.actions.find((candidate) => candidate.id === "create");
    if (!variable || !healthCheck || !domain || !certificate) {
      throw new Error("console configuration actions are unavailable");
    }

    await expect(variable.execute({
      scopeId: "site-1",
      body: { key: "INVALID-KEY", value: "secret", environment: "production", isSecret: true },
      idempotencyKey: "invalid-variable",
    })).rejects.toThrow("Variable key is invalid");
    await expect(healthCheck.execute({
      scopeId: "site-1",
      body: { checkType: 1, checkUrl: "/health", checkInterval: 5, timeoutMs: 5_001, retryCount: 3 },
      idempotencyKey: "invalid-health-check",
    })).rejects.toThrow("must not exceed the check interval");
    await expect(domain.execute({
      scopeId: "site-1",
      body: { hostname: "bad host", sslEnabled: true, sslProvider: "letsencrypt" },
      idempotencyKey: "invalid-domain",
    })).rejects.toThrow("safe ASCII DNS name");
    await expect(certificate.execute({
      scopeId: "site-1",
      body: { domainId: "domain-1", certType: 3, autoRenew: true },
      idempotencyKey: "invalid-certificate-renewal",
    })).rejects.toThrow("unavailable for self-signed certificates");

    expect(createVariable).not.toHaveBeenCalled();
    expect(createHealthCheck).not.toHaveBeenCalled();
    expect(createDomain).not.toHaveBeenCalled();
    expect(createCertificate).not.toHaveBeenCalled();
  });
});

function preparedArchive() {
  const archive = new File(["hello"], "release.zip", { type: "application/zip" });
  return {
    archive,
    archiveHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    inputMode: "archive" as const,
    sourceFileCount: 1,
    uncompressedSize: archive.size,
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
        uri: `drive://spaces/store-assets/nodes/${nodeId}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: String(file.size),
        width: 1024,
        height: role === "cover" ? 500 : 1024,
        altText,
        metadata: { drive: { nodeId, spaceId: "store-assets" } },
      };
    }),
  };
}

describe("admin access classification", () => {
  it("recognizes module wildcards without treating a normal app user as an admin", () => {
    expect(hasWebserverAdminAccess(["web.*"])).toBe(true);
    expect(hasWebserverAdminAccess(["*"])).toBe(true);
    expect(hasWebserverAdminAccess(["web.sites.*"])).toBe(false);
    expect(hasWebserverAdminAccess([])).toBe(false);
  });

  it("distinguishes tenant and platform super administrators from partial operators", () => {
    expect(hasWebserverSuperAdminAccess(["web.*"])).toBe(true);
    expect(hasWebserverSuperAdminAccess(["*"])).toBe(true);
    expect(hasWebserverSuperAdminAccess(["web.sites.*"])).toBe(false);
    expect(hasWebserverSuperAdminAccess(["web.nginx.write", "web.servers.read"])).toBe(false);
    expect(hasPlatformSuperAdminAccess(["*"])).toBe(true);
    expect(hasPlatformSuperAdminAccess(["web.*"])).toBe(false);
  });
});

function renderWorkspace(
  path: string,
  registry: WebserverResourceRegistry,
  permissionScope: readonly string[],
  onSignOut = vi.fn(),
  locale: "en-US" | "zh-CN" = "en-US",
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/console/*"
          element={(
            <WebserverWorkspace
              locale={locale}
              modules={consoleModules}
              notificationsHref="/notifications"
              onSignOut={onSignOut}
              permissionScope={permissionScope}
              portalHref="/"
              registry={registry}
              surface="app-console"
              userLabel="user@example.test"
            />
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

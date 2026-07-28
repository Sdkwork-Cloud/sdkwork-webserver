// @vitest-environment jsdom

import {
  hasWebserverAdminAccess,
  hasPlatformSuperAdminAccess,
  hasWebserverSuperAdminAccess,
  WebserverWorkspace,
  type WebserverResourceRegistry,
} from "@sdkwork/webserver-pc-commons";
import { webserverModule as configurationModule } from "@sdkwork/webserver-pc-console-site-configuration";
import { webserverModule as deliveryModule } from "@sdkwork/webserver-pc-console-delivery";
import { webserverModule as deploymentsModule } from "@sdkwork/webserver-pc-console-deployments";
import { webserverModule as sitesModule } from "@sdkwork/webserver-pc-console-sites";
import {
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
            commitHash: "",
            deployType: 1,
            environment: "production",
            sourceRef: "main",
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
    expect(screen.getByText("源码分支")).toBeTruthy();
  });

  it("uploads an application package to Drive before creating a deployment", async () => {
    const uploadArchive = vi.fn().mockResolvedValue({
      uploadSession: { spaceId: "space-1", nodeId: "node-1" },
    });
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1", status: 0 });
    const registry = createWebserverConsoleRegistry({
      drive: { uploader: { uploadArchive } },
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
      appResourceType: "web.deployment",
      checksumSha256Hex: "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      file,
      scene: "application-deployment",
      source: "sdkwork-webserver-pc",
    }));
    expect(createDeployment).toHaveBeenCalledWith("site-1", expect.objectContaining({
      artifactDriveUri: "drive://spaces/space-1/nodes/node-1",
      artifactHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      artifactSize: "5",
      deployType: 1,
      environment: "production",
      idempotencyKey: "release-attempt-1",
      versionTag: "v1.2.3",
    }));
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
});

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

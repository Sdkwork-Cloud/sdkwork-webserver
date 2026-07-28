// @vitest-environment jsdom

import { createWebserverAdminApplicationRegistry, webserverModule as applicationsModule } from "@sdkwork/webserver-pc-admin-applications";
import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import { WebserverWorkspace } from "@sdkwork/webserver-pc-commons";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

describe("admin workspace application controls", () => {
  it("renders constrained application fields as selects", async () => {
    const create = vi.fn().mockResolvedValue({ id: "app-1" });
    const registry = createWebserverAdminApplicationRegistry(client({ create }));
    renderWorkspace("/admin/applications", registry);

    const createButton = await screen.findByRole("button", { name: "Create application" });
    fireEvent.click(createButton);

    const applicationType = screen.getByLabelText("Application type");
    const siteType = screen.getByLabelText("Runtime type");
    expect(applicationType.tagName).toBe("SELECT");
    expect(siteType.tagName).toBe("SELECT");
    fireEvent.change(applicationType, { target: { value: "API" } });
    fireEvent.change(siteType, { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Public API" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(
      { name: "Public API", applicationType: "API", siteType: 6 },
      { idempotencyKey: expect.any(String) },
    ));
  });

  it("uses an application-specific scope for domain management", async () => {
    const listDomains = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const registry = createWebserverAdminApplicationRegistry(client({ listDomains }));
    renderWorkspace("/admin/application-domains", registry);

    const scopeInput = await screen.findByRole("combobox", { name: "Application" });
    expect((scopeInput as HTMLSelectElement).value).toBe("app-1");
    await waitFor(() => expect(listDomains).toHaveBeenCalledWith("app-1", { page: 1, pageSize: 20 }));
  });

  it("prefills updates from the selected application", async () => {
    const update = vi.fn().mockResolvedValue({ id: "app-1" });
    const registry = createWebserverAdminApplicationRegistry(client({
      applicationItems: [{ id: "app-1", name: "Public API", description: "Current description", status: 1 }],
      update,
    }));
    renderWorkspace("/admin/applications", registry);

    fireEvent.click(await screen.findByText("Public API"));
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect((screen.getByLabelText("Application name") as HTMLInputElement).value).toBe("Public API");
    expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("Current description");
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Public API v2" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(
      "app-1",
      { name: "Public API v2", description: "Current description" },
      { idempotencyKey: expect.any(String) },
    ));
  });

  it("requires explicit confirmation before disabling an active application", async () => {
    const pause = vi.fn().mockResolvedValue({ id: "app-1", status: 2 });
    const registry = createWebserverAdminApplicationRegistry(client({
      applicationItems: [{ id: "app-1", name: "Public API", status: 1 }],
      pause,
    }));
    renderWorkspace("/admin/applications", registry);

    fireEvent.click(await screen.findByText("Public API"));
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("I understand the impact and want to continue."));
    fireEvent.click(confirm);

    await waitFor(() => expect(pause).toHaveBeenCalledWith("app-1", { idempotencyKey: expect.any(String) }));
  });

  it("offers rollback only for a successful deployment and confirms the command", async () => {
    const rollback = vi.fn().mockResolvedValue({ id: "rollback-1", status: 0 });
    const registry = createWebserverAdminApplicationRegistry(client({
      deploymentItems: [{ id: "deployment-1", environment: "production", status: 2 }],
      rollback,
    }));
    renderWorkspace("/admin/application-deployments", registry);

    fireEvent.click(await screen.findByText("Succeeded"));
    const rollbackButton = screen.getByRole("button", { name: "Create rollback command" });
    expect((rollbackButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(rollbackButton);
    fireEvent.click(screen.getByText("I understand the impact and want to continue."));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(rollback).toHaveBeenCalledWith(
      "app-1",
      "deployment-1",
      { idempotencyKey: expect.any(String) },
    ));
  });

  it("hides lifecycle commands without write permission", async () => {
    const registry = createWebserverAdminApplicationRegistry(client({}));
    renderWorkspace("/admin/applications", registry, ["web.sites.read"]);

    await screen.findByText("Public API");
    expect(screen.queryByRole("button", { name: "Create application" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});

function client(overrides: {
  applicationItems?: Record<string, unknown>[];
  create?: ReturnType<typeof vi.fn>;
  deploymentItems?: Record<string, unknown>[];
  listDomains?: ReturnType<typeof vi.fn>;
  pause?: ReturnType<typeof vi.fn>;
  rollback?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}): WebserverAdminSdkClient {
  return {
    application: {
      list: vi.fn().mockResolvedValue({ items: overrides.applicationItems ?? [{ id: "app-1", name: "Public API" }], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
      create: overrides.create ?? vi.fn(),
      update: overrides.update ?? vi.fn(),
      activate: vi.fn(),
      pause: overrides.pause ?? vi.fn(),
      delete: vi.fn(),
    },
    applicationDomain: {
      applications: {
        domains: {
          list: overrides.listDomains ?? vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
          create: vi.fn(),
          verify: vi.fn(),
          delete: vi.fn(),
        },
      },
    },
    applicationDeployment: {
      applications: {
        deployments: {
          list: vi.fn().mockResolvedValue({ items: overrides.deploymentItems ?? [], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
          create: vi.fn(),
          rollback: overrides.rollback ?? vi.fn(),
        },
      },
    },
  } as unknown as WebserverAdminSdkClient;
}

function renderWorkspace(
  path: string,
  registry: ReturnType<typeof createWebserverAdminApplicationRegistry>,
  permissionScope: readonly string[] = ["*"],
): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <WebserverWorkspace
              locale="en-US"
              modules={[applicationsModule]}
              permissionScope={permissionScope}
              registry={registry}
              surface="backend-admin"
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

// @vitest-environment jsdom

import { createWebserverAdminApplicationRegistry, webserverModule as applicationsModule } from "@sdkwork/webserver-pc-admin-applications";
import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import { WebserverWorkspace, type ApplicationSourceStorage } from "@sdkwork/webserver-pc-commons";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

describe("admin workspace application controls", () => {
  it("renders constrained application fields as selects", async () => {
    const create = vi.fn().mockResolvedValue({ id: "app-1" });
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1", status: 0 });
    const sourceStorage = testSourceStorage();
    const registry = createWebserverAdminApplicationRegistry(client({ create, createDeployment }), sourceStorage);
    renderWorkspace("/admin/applications", registry);

    const createButton = await screen.findByRole("button", { name: "Create application" });
    fireEvent.click(createButton);

    const applicationType = screen.getByLabelText("Application type");
    const siteType = screen.getByLabelText("Runtime type");
    expect(applicationType.tagName).toBe("SELECT");
    expect(siteType.tagName).toBe("SELECT");
    expect(Array.from((siteType as HTMLSelectElement).options, (option) => option.text)).toEqual([
      "Static site",
      "Single-page application (SPA)",
      "Node.js",
      "PHP",
      "Python",
      "Other",
    ]);
    fireEvent.change(applicationType, { target: { value: "API" } });
    fireEvent.change(siteType, { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Public API" } });
    fireEvent.change(screen.getByLabelText("Application source"), {
      target: { files: [new File(["source"], "source.zip", { type: "application/zip" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Public API", applicationType: "API", siteType: 6 }),
      { idempotencyKey: expect.any(String) },
    ));
    expect(sourceStorage.store).toHaveBeenCalledWith(expect.objectContaining({ applicationId: "app-1" }));
    expect(createDeployment).toHaveBeenCalledWith("app-1", expect.objectContaining({
      artifactDriveUri: "drive://spaces/space-1/nodes/node-1",
      versionTag: "v1.0.0",
    }), { idempotencyKey: expect.any(String) });
  });

  it("uses an application-specific scope for domain management", async () => {
    const listDomains = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const registry = createWebserverAdminApplicationRegistry(client({ listDomains }), testSourceStorage());
    renderWorkspace("/admin/application-domains", registry);

    const scopeInput = await screen.findByRole("combobox", { name: "Application" });
    expect((scopeInput as HTMLSelectElement).value).toBe("app-1");
    await waitFor(() => expect(listDomains).toHaveBeenCalledWith("app-1", { page: 1, pageSize: 20 }));
  });

  it("prevents duplicate submissions and locks dismissal while application creation is running", async () => {
    let resolveCreate: ((value: { id: string }) => void) | undefined;
    const create = vi.fn(() => new Promise<{ id: string }>((resolve) => {
      resolveCreate = resolve;
    }));
    const createDeployment = vi.fn().mockResolvedValue({ id: "deployment-1", status: 0 });
    const sourceStorage = testSourceStorage();
    const registry = createWebserverAdminApplicationRegistry(
      client({ create, createDeployment }),
      sourceStorage,
    );
    renderWorkspace("/admin/applications", registry);

    fireEvent.click(await screen.findByRole("button", { name: "Create application" }));
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Commercial portal" } });
    fireEvent.change(screen.getByLabelText("Application source"), {
      target: { files: [new File(["source"], "source.zip", { type: "application/zip" })] },
    });
    const dialog = screen.getByRole("dialog");
    fireEvent.submit(dialog);
    fireEvent.submit(dialog);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(sourceStorage.prepare).toHaveBeenCalledWith(expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));
    expect((screen.getByRole("button", { name: "Close" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Submitting..." })).toBeTruthy();

    resolveCreate?.({ id: "app-1" });
    await waitFor(() => expect(createDeployment).toHaveBeenCalledTimes(1));
  });

  it("shows a recoverable draft message when initial deployment creation fails", async () => {
    const create = vi.fn().mockResolvedValue({ id: "app-1" });
    const createDeployment = vi.fn().mockRejectedValue(new Error("provider detail must remain hidden"));
    const registry = createWebserverAdminApplicationRegistry(
      client({ create, createDeployment }),
      testSourceStorage(),
    );
    renderWorkspace("/admin/applications", registry);

    fireEvent.click(await screen.findByRole("button", { name: "Create application" }));
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Commercial portal" } });
    fireEvent.change(screen.getByLabelText("Application source"), {
      target: { files: [new File(["source"], "source.zip", { type: "application/zip" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Application app-1 and its source package were created, but the initial deployment command was not accepted.",
    );
    expect(screen.queryByText("provider detail must remain hidden")).toBeNull();
  });

  it("prefills updates from the selected application", async () => {
    const update = vi.fn().mockResolvedValue({ id: "app-1" });
    const registry = createWebserverAdminApplicationRegistry(client({
      applicationItems: [{ id: "app-1", name: "Public API", description: "Current description", status: 1 }],
      update,
    }), testSourceStorage());
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
    }), testSourceStorage());
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
    }), testSourceStorage());
    renderWorkspace("/admin/application-deployments", registry);

    fireEvent.click(await screen.findByText("Succeeded"));
    const rollbackButton = screen.getByRole("button", { name: "Restore this version" });
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
    const registry = createWebserverAdminApplicationRegistry(client({}), testSourceStorage());
    renderWorkspace("/admin/applications", registry, ["web.sites.read"]);

    await screen.findByText("Public API");
    expect(screen.queryByRole("button", { name: "Create application" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});

function client(overrides: {
  applicationItems?: Record<string, unknown>[];
  create?: ReturnType<typeof vi.fn>;
  createDeployment?: ReturnType<typeof vi.fn>;
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
          create: overrides.createDeployment ?? vi.fn(),
          rollback: overrides.rollback ?? vi.fn(),
        },
      },
    },
  } as unknown as WebserverAdminSdkClient;
}

function testSourceStorage(): ApplicationSourceStorage {
  return {
    prepare: vi.fn(async ({ files, mode }) => ({
      archive: files[0] ?? new File(["source"], "source.zip", { type: "application/zip" }),
      archiveHash: "a".repeat(64),
      inputMode: mode,
      sourceFileCount: files.length || 1,
      uncompressedSize: files[0]?.size ?? 6,
    })),
    store: vi.fn().mockResolvedValue({
      archiveDriveUri: "drive://spaces/space-1/nodes/node-1",
      archiveHash: "a".repeat(64),
      archiveSize: "6",
      extractedCount: "1",
    }),
  };
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

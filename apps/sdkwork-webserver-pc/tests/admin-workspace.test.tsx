// @vitest-environment jsdom

import { createWebserverAdminApplicationRegistry, webserverModule as applicationsModule } from "@sdkwork/webserver-pc-admin-applications";
import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import { WebserverWorkspace } from "@sdkwork/webserver-pc-commons";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

describe("admin workspace application controls", () => {
  it("renders constrained application fields as selects", async () => {
    const create = vi.fn().mockResolvedValue({ id: "app-1" });
    const registry = createWebserverAdminApplicationRegistry(client({ create }));
    renderWorkspace("/admin/applications", registry);

    const createButton = await screen.findByRole("button", { name: "Create application" });
    fireEvent.click(createButton);

    const applicationType = screen.getByLabelText("application Type");
    const siteType = screen.getByLabelText("site Type");
    expect(applicationType.tagName).toBe("SELECT");
    expect(siteType.tagName).toBe("SELECT");
    fireEvent.change(applicationType, { target: { value: "API" } });
    fireEvent.change(siteType, { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Public API" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: "Public API", applicationType: "API", siteType: 6 }));
  });

  it("uses an application-specific scope for domain management", async () => {
    const listDomains = vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } });
    const registry = createWebserverAdminApplicationRegistry(client({ listDomains }));
    renderWorkspace("/admin/application-domains", registry);

    expect(await screen.findByText("Enter an application ID to load scoped resources.")).toBeTruthy();
    const scopeInput = screen.getByPlaceholderText("Application ID");
    fireEvent.change(scopeInput, { target: { value: "app-1" } });

    await waitFor(() => expect(listDomains).toHaveBeenCalledWith("app-1", { page: 1, pageSize: 20 }));
  });
});

function client(overrides: { create?: ReturnType<typeof vi.fn>; listDomains?: ReturnType<typeof vi.fn> }): WebserverAdminSdkClient {
  return {
    application: {
      list: vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
      create: overrides.create ?? vi.fn(),
    },
    applicationDomain: {
      applications: {
        domains: {
          list: overrides.listDomains ?? vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
          create: vi.fn(),
          verify: vi.fn(),
        },
      },
    },
    applicationDeployment: {
      applications: {
        deployments: {
          list: vi.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false } }),
          create: vi.fn(),
        },
      },
    },
  } as unknown as WebserverAdminSdkClient;
}

function renderWorkspace(path: string, registry: ReturnType<typeof createWebserverAdminApplicationRegistry>): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <WebserverWorkspace
              locale="en-US"
              modules={[applicationsModule]}
              permissionScope={[]}
              registry={registry}
              surface="backend-admin"
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

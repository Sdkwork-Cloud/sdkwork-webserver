// @vitest-environment jsdom

import {
  WebserverAdminSdkProvider,
  type WebserverAdminSdkClient,
} from "@sdkwork/webserver-pc-admin-core";
import { RootDomainManagement } from "@sdkwork/webserver-pc-admin-domains";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

describe("root-domain management", () => {
  it("opens a root domain on its own page and projects the latest application deployment", async () => {
    const rootDomain = {
      activeDeploymentCount: "1",
      boundSubdomainCount: "1",
      createdAt: "2026-07-30T08:00:00.000Z",
      hostname: "example.com",
      httpsSubdomainCount: "1",
      id: "root-domain-1",
      status: 1,
      subdomainCount: "1",
      updatedAt: "2026-07-30T09:00:00.000Z",
      verifiedSubdomainCount: "1",
    };
    const list = vi.fn().mockResolvedValue({
      items: [rootDomain],
      pageInfo: { mode: "offset", page: 1, pageSize: 20, totalItems: "1" },
    });
    const retrieve = vi.fn().mockResolvedValue(rootDomain);
    const unbind = vi.fn().mockResolvedValue(undefined);
    const listSubdomains = vi.fn().mockResolvedValue({
      items: [{
        applicationId: "application-1",
        applicationName: "Public API",
        certificateCount: "1",
        createdAt: "2026-07-30T08:10:00.000Z",
        hostname: "example.com",
        id: "domain-1",
        isPrimary: true,
        isVerified: true,
        latestDeployment: {
          createdAt: "2026-07-30T08:30:00.000Z",
          environment: "production",
          id: "deployment-42",
          status: 2,
          versionTag: "v42",
        },
        recordName: "@",
        rootDomainId: "root-domain-1",
        sslEnabled: true,
        sslProvider: "letsencrypt",
        status: 1,
        updatedAt: "2026-07-30T09:00:00.000Z",
      }],
      pageInfo: { mode: "offset", page: 1, pageSize: 20, totalItems: "1" },
    });
    const sdk = {
      application: { list: vi.fn().mockResolvedValue({ items: [], pageInfo: { mode: "offset" } }) },
      certificate: { create: vi.fn() },
      domain: {
        applicationBinding: { delete: unbind, update: vi.fn() },
        delete: vi.fn(),
        rootDomains: {
          create: vi.fn(),
          delete: vi.fn(),
          list,
          retrieve,
          subdomains: { create: vi.fn(), list: listSubdomains },
        },
        verify: vi.fn(),
      },
    } as unknown as WebserverAdminSdkClient;

    render(
      <WebserverAdminSdkProvider client={sdk}>
        <MemoryRouter initialEntries={["/admin/root-domains"]}>
          <Routes>
            <Route
              path="/admin/root-domains/*"
              element={<RootDomainManagement locale="en-US" permissionScope={["web.sites.read", "web.sites.write"]} />}
            />
          </Routes>
        </MemoryRouter>
      </WebserverAdminSdkProvider>,
    );

    expect(await screen.findByText("example.com")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Manage hostnames" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Delete root domain" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Quick add hostname" }));

    await waitFor(() => expect(retrieve).toHaveBeenCalledWith("root-domain-1"));
    expect(listSubdomains).toHaveBeenCalledWith("root-domain-1", { page: 1, pageSize: 20 });
    expect(await screen.findByRole("dialog", { name: "Add hostname" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByText("Public API")).toBeTruthy();
    expect(screen.getByText(/v42/)).toBeTruthy();
    expect(screen.getByText("Primary")).toBeTruthy();
    expect(screen.getByText("1 certificates")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Unbind application" }));
    expect(unbind).not.toHaveBeenCalled();
    expect(screen.getByText(/may interrupt live traffic/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unbind" }));
    await waitFor(() => expect(unbind).toHaveBeenCalledWith(
      "domain-1",
      { idempotencyKey: expect.any(String) },
    ));
  });

  it("searches applications through server pagination when adding a hostname", async () => {
    const rootDomain = {
      activeDeploymentCount: "0",
      boundSubdomainCount: "0",
      createdAt: "2026-07-30T08:00:00.000Z",
      hostname: "example.com",
      httpsSubdomainCount: "0",
      id: "root-domain-1",
      status: 1,
      subdomainCount: "0",
      updatedAt: "2026-07-30T09:00:00.000Z",
      verifiedSubdomainCount: "0",
    };
    const listApplications = vi.fn().mockResolvedValue({
      items: [{ applicationType: "API", id: "application-1", name: "Public API" }],
      pageInfo: { hasMore: false, mode: "offset", page: 1, pageSize: 10, totalItems: "1" },
    });
    const sdk = {
      application: { list: listApplications },
      certificate: { create: vi.fn() },
      domain: {
        applicationBinding: { delete: vi.fn(), update: vi.fn() },
        delete: vi.fn(),
        rootDomains: {
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(),
          retrieve: vi.fn().mockResolvedValue(rootDomain),
          subdomains: {
            create: vi.fn(),
            list: vi.fn().mockResolvedValue({
              items: [],
              pageInfo: { hasMore: false, mode: "offset", page: 1, pageSize: 20, totalItems: "0" },
            }),
          },
        },
        verify: vi.fn(),
      },
    } as unknown as WebserverAdminSdkClient;

    render(
      <WebserverAdminSdkProvider client={sdk}>
        <MemoryRouter initialEntries={["/admin/root-domains/root-domain-1"]}>
          <Routes>
            <Route
              path="/admin/root-domains/*"
              element={(
                <RootDomainManagement
                  locale="en-US"
                  permissionScope={["web.sites.read", "web.sites.write"]}
                />
              )}
            />
          </Routes>
        </MemoryRouter>
      </WebserverAdminSdkProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Add hostname" }));
    await waitFor(() => expect(listApplications).toHaveBeenCalledWith(
      { keyword: undefined, page: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));

    const search = screen.getByRole("textbox", { name: "Search applications" });
    fireEvent.change(search, { target: { value: "api" } });
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => expect(listApplications).toHaveBeenLastCalledWith(
      { keyword: "api", page: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(await screen.findByText("Public API")).toBeTruthy();
  });
});

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
      certificate: { issue: vi.fn() },
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
      certificate: { issue: vi.fn() },
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

  it("manages ECDSA and RSA listener certificates for one application domain", async () => {
    const rootDomain = rootDomainFixture();
    const domain = subdomainFixture();
    const ecdsaBinding = listenerBindingFixture({
      certificateId: "certificate-ecdsa",
      certificateName: "example.com ECDSA",
      id: "binding-ecdsa",
      keyAlgorithm: "ECDSA",
    });
    const rsaBinding = listenerBindingFixture({
      certificateId: "certificate-rsa",
      certificateName: "example.com RSA",
      id: "binding-rsa",
      keyAlgorithm: "RSA",
    });
    const listBindings = vi.fn()
      .mockResolvedValueOnce(pageOf([ecdsaBinding]))
      .mockResolvedValueOnce(pageOf([ecdsaBinding]))
      .mockResolvedValueOnce(pageOf([ecdsaBinding, rsaBinding]))
      .mockResolvedValueOnce(pageOf([rsaBinding]));
    const listCertificates = vi.fn().mockResolvedValue(pageOf([
      certificateFixture("certificate-ecdsa", "example.com ECDSA", "ECDSA"),
      certificateFixture("certificate-rsa", "example.com RSA", "RSA"),
    ]));
    const issueCertificate = vi.fn().mockResolvedValue({
      accepted: true,
      operationId: "operation-rsa-issue",
      status: "pending",
    });
    const retrieveOperation = vi.fn().mockResolvedValue({
      certificateId: "certificate-rsa",
      id: "operation-rsa-issue",
      operationType: "ISSUE",
      status: "SUCCEEDED",
    });
    const bindCertificate = vi.fn().mockResolvedValue(rsaBinding);
    const removeBinding = vi.fn().mockResolvedValue(undefined);
    const sdk = domainSdk({
      certificate: {
        applications: {
          domains: {
            listenerCertificateBindings: {
              create: bindCertificate,
              delete: removeBinding,
              list: listBindings,
            },
          },
        },
        issue: issueCertificate,
        list: listCertificates,
        operations: { retrieve: retrieveOperation },
      },
      rootDomain,
      subdomains: [domain],
    });

    renderRootDomain(sdk, [
      "web.sites.read",
      "web.certificates.read",
      "web.certificates.write",
    ]);

    fireEvent.click(await screen.findByRole("button", { name: "Manage certificates" }));
    expect(await screen.findByRole("dialog", { name: "Certificate management for example.com" })).toBeTruthy();
    await waitFor(() => expect(listCertificates).toHaveBeenCalledWith({
      domainId: "domain-1",
      page: 1,
      pageSize: 10,
    }));
    expect(listBindings).toHaveBeenCalledWith(
      "application-1",
      "domain-1",
      { page: 1, pageSize: 10 },
    );

    fireEvent.click(screen.getByRole("button", { name: "RSA" }));
    fireEvent.click(screen.getByRole("button", { name: "Issue new certificate" }));
    await waitFor(() => expect(issueCertificate).toHaveBeenCalledWith(
      {
        autoRenew: true,
        certType: 1,
        domainIds: ["domain-1"],
        keyAlgorithm: "RSA",
      },
      { idempotencyKey: expect.any(String) },
      expect.objectContaining({ signal: expect.any(AbortSignal), timeout: 30_000 }),
    ));
    await waitFor(() => expect(retrieveOperation).toHaveBeenCalledWith(
      "operation-rsa-issue",
      expect.objectContaining({ signal: expect.any(AbortSignal), timeout: 30_000 }),
    ));

    fireEvent.click(screen.getByRole("radio", { name: /example\.com RSA/ }));
    fireEvent.click(screen.getByRole("button", { name: "Bind certificate" }));
    await waitFor(() => expect(bindCertificate).toHaveBeenCalledWith(
      "application-1",
      "domain-1",
      {
        certificateId: "certificate-rsa",
        isDefault: false,
        priority: 100,
      },
      { idempotencyKey: expect.any(String) },
    ));
    expect((await screen.findAllByText("example.com RSA")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Remove certificate binding" })[0]);
    expect(screen.getByRole("alertdialog", { name: "Remove certificate binding" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unbind" }));
    await waitFor(() => expect(removeBinding).toHaveBeenCalledWith(
      "application-1",
      "domain-1",
      "binding-ecdsa",
      { idempotencyKey: expect.any(String) },
    ));
  });

  it("exposes listener certificate details without mutation controls to read-only operators", async () => {
    const binding = listenerBindingFixture({
      certificateId: "certificate-ecdsa",
      certificateName: "example.com ECDSA",
      id: "binding-ecdsa",
      keyAlgorithm: "ECDSA",
    });
    const sdk = domainSdk({
      certificate: {
        applications: {
          domains: {
            listenerCertificateBindings: {
              create: vi.fn(),
              delete: vi.fn(),
              list: vi.fn().mockResolvedValue(pageOf([binding])),
            },
          },
        },
        issue: vi.fn(),
        list: vi.fn().mockResolvedValue(pageOf([
          certificateFixture("certificate-ecdsa", "example.com ECDSA", "ECDSA"),
        ])),
      },
      rootDomain: rootDomainFixture(),
      subdomains: [subdomainFixture()],
    });

    renderRootDomain(sdk, ["web.sites.read", "web.certificates.read"]);
    fireEvent.click(await screen.findByRole("button", { name: "Manage certificates" }));

    expect((await screen.findAllByText("example.com ECDSA")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Issue new certificate" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove certificate binding" })).toBeNull();
  });

  it("shows every returned certificate as a binding candidate with explicit availability", async () => {
    const certificates = [
      { ...certificateFixture("certificate-pending", "Pending certificate", "ECDSA"), status: "PENDING" },
      certificateFixture("certificate-issued", "Issued certificate", "ECDSA"),
      { ...certificateFixture("certificate-failed", "Failed certificate", "RSA"), status: "FAILED" },
      { ...certificateFixture("certificate-expired", "Expired certificate", "RSA"), status: "EXPIRED" },
      { ...certificateFixture("certificate-revoked", "Revoked certificate", "RSA"), status: "REVOKED" },
      { ...certificateFixture("certificate-archived", "Archived certificate", "RSA"), status: "ARCHIVED" },
    ];
    const sdk = domainSdk({
      certificate: {
        applications: {
          domains: {
            listenerCertificateBindings: {
              create: vi.fn(),
              delete: vi.fn(),
              list: vi.fn().mockResolvedValue(pageOf([])),
            },
          },
        },
        issue: vi.fn(),
        list: vi.fn().mockResolvedValue(pageOf(certificates)),
      },
      rootDomain: rootDomainFixture(),
      subdomains: [subdomainFixture()],
    });

    renderRootDomain(sdk, [
      "web.sites.read",
      "web.certificates.read",
      "web.certificates.write",
    ]);
    fireEvent.click(await screen.findByRole("button", { name: "Manage certificates" }));

    const candidates = await screen.findAllByRole("radio");
    expect(candidates).toHaveLength(certificates.length);
    expect((screen.getByRole("radio", { name: /Pending certificate.*issuance has not completed/i }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Issued certificate/i }) as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole("radio", { name: /Failed certificate.*not available/i }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Expired certificate.*cannot be bound/i }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Revoked certificate.*cannot be bound/i }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Archived certificate.*cannot be bound/i }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByText("No active certificates cover this hostname")).toBeNull();
  });

  it("reserves a key algorithm while its listener binding is not archived", async () => {
    const pendingBinding = {
      ...listenerBindingFixture({
        certificateId: "certificate-pending-binding",
        certificateName: "Pending listener certificate",
        id: "binding-pending",
        keyAlgorithm: "ECDSA",
      }),
      activatedAt: undefined,
      currentCertificate: undefined,
      currentCertificateVersionId: undefined,
      status: "PENDING",
    };
    const candidate = certificateFixture(
      "certificate-candidate",
      "Candidate ECDSA certificate",
      "ECDSA",
    );
    const sdk = domainSdk({
      certificate: {
        applications: {
          domains: {
            listenerCertificateBindings: {
              create: vi.fn(),
              delete: vi.fn(),
              list: vi.fn().mockResolvedValue(pageOf([pendingBinding])),
            },
          },
        },
        issue: vi.fn(),
        list: vi.fn().mockResolvedValue(pageOf([candidate])),
      },
      rootDomain: rootDomainFixture(),
      subdomains: [subdomainFixture()],
    });

    renderRootDomain(sdk, [
      "web.sites.read",
      "web.certificates.read",
      "web.certificates.write",
    ]);
    fireEvent.click(await screen.findByRole("button", { name: "Manage certificates" }));

    const candidateControl = await screen.findByRole("radio", {
      name: /Candidate ECDSA certificate/i,
    });
    expect((candidateControl as HTMLInputElement).disabled).toBe(true);
  });

  it("issues a certificate for a verified hostname before an application is bound", async () => {
    const domain = {
      ...subdomainFixture(),
      applicationId: undefined,
      applicationName: undefined,
      certificateCount: "1",
      isPrimary: false,
    };
    const certificate = certificateFixture("certificate-ecdsa", "example.com ECDSA", "ECDSA");
    const listBindings = vi.fn().mockResolvedValue(pageOf([]));
    const listCertificates = vi.fn().mockResolvedValue(pageOf([certificate]));
    const issueCertificate = vi.fn().mockResolvedValue({
      accepted: true,
      operationId: "operation-domain-issue-1",
      status: "pending",
    });
    const retrieveOperation = vi.fn().mockResolvedValue({
      certificateId: certificate.id,
      id: "operation-domain-issue-1",
      operationType: "ISSUE",
      status: "SUCCEEDED",
    });
    const sdk = domainSdk({
      certificate: {
        applications: {
          domains: {
            listenerCertificateBindings: {
              create: vi.fn(),
              delete: vi.fn(),
              list: listBindings,
            },
          },
        },
        issue: issueCertificate,
        list: listCertificates,
        operations: { retrieve: retrieveOperation },
      },
      rootDomain: rootDomainFixture(),
      subdomains: [domain],
    });

    renderRootDomain(sdk, [
      "web.sites.read",
      "web.certificates.read",
      "web.certificates.write",
    ]);

    fireEvent.click(await screen.findByRole("button", { name: "Manage certificates" }));
    expect(await screen.findByRole("dialog", { name: "Certificate management for example.com" })).toBeTruthy();
    await waitFor(() => expect(listCertificates).toHaveBeenCalledWith({
      domainId: "domain-1",
      page: 1,
      pageSize: 10,
    }));
    expect(listBindings).not.toHaveBeenCalled();
    expect(screen.getByText(/Certificate issuance remains available/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bind certificate" })).toBeNull();

    const issueButton = screen.getByRole("button", { name: "Issue new certificate" });
    expect((issueButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(issueButton);

    await waitFor(() => expect(issueCertificate).toHaveBeenCalledWith(
      {
        autoRenew: true,
        certType: 1,
        domainIds: ["domain-1"],
        keyAlgorithm: "ECDSA",
      },
      { idempotencyKey: expect.any(String) },
      expect.objectContaining({ signal: expect.any(AbortSignal), timeout: 30_000 }),
    ));
    await waitFor(() => expect(retrieveOperation).toHaveBeenCalledWith(
      "operation-domain-issue-1",
      expect.objectContaining({ signal: expect.any(AbortSignal), timeout: 30_000 }),
    ));
    expect(listBindings).not.toHaveBeenCalled();
  });

  it("localizes SDK failures without exposing raw permission diagnostics", async () => {
    const sdk = domainSdk({
      certificate: { issue: vi.fn(), list: vi.fn().mockResolvedValue(pageOf([])) },
      rootDomain: rootDomainFixture(),
      subdomains: [],
    });
    vi.mocked(sdk.domain.rootDomains.retrieve).mockRejectedValue({
      code: "FORBIDDEN",
      httpStatus: 403,
      problem: {
        code: 40301,
        detail: "permission web.sites.read denied for tenant 42",
        status: 403,
        traceId: "trace-root-domain-40301",
      },
    });

    renderRootDomain(sdk, ["web.sites.read"]);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("does not have permission");
    expect(alert.textContent).toContain("Support reference: trace-root-domain-40301");
    expect(alert.textContent).not.toContain("web.sites.read");
    expect(alert.textContent).not.toContain("tenant 42");
  });
});

function renderRootDomain(
  sdk: WebserverAdminSdkClient,
  permissionScope: readonly string[],
): void {
  render(
    <WebserverAdminSdkProvider client={sdk}>
      <MemoryRouter initialEntries={["/admin/root-domains/root-domain-1"]}>
        <Routes>
          <Route
            path="/admin/root-domains/*"
            element={<RootDomainManagement locale="en-US" permissionScope={permissionScope} />}
          />
        </Routes>
      </MemoryRouter>
    </WebserverAdminSdkProvider>,
  );
}

function domainSdk({ certificate, rootDomain, subdomains }: {
  certificate: unknown;
  rootDomain: ReturnType<typeof rootDomainFixture>;
  subdomains: readonly Record<string, unknown>[];
}): WebserverAdminSdkClient {
  return {
    application: { list: vi.fn().mockResolvedValue(pageOf([])) },
    certificate,
    domain: {
      applicationBinding: { delete: vi.fn(), update: vi.fn() },
      delete: vi.fn(),
      rootDomains: {
        create: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
        retrieve: vi.fn().mockResolvedValue(rootDomain),
        subdomains: { create: vi.fn(), list: vi.fn().mockResolvedValue(pageOf(subdomains, 20)) },
      },
      verify: vi.fn(),
    },
  } as unknown as WebserverAdminSdkClient;
}

function rootDomainFixture() {
  return {
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
}

function subdomainFixture() {
  return {
    applicationId: "application-1",
    applicationName: "Public API",
    certificateCount: "2",
    createdAt: "2026-07-30T08:10:00.000Z",
    hostname: "example.com",
    id: "domain-1",
    isPrimary: true,
    isVerified: true,
    recordName: "@",
    rootDomainId: "root-domain-1",
    sslEnabled: true,
    sslProvider: "letsencrypt",
    status: 1,
    updatedAt: "2026-07-30T09:00:00.000Z",
  };
}

function certificateFixture(id: string, certName: string, keyAlgorithm: "ECDSA" | "RSA") {
  return {
    autoRenew: true,
    certName,
    certType: 1,
    createdAt: "2026-07-30T08:00:00.000Z",
    fingerprint: `${id}-fingerprint`,
    id,
    identifiers: [{ domainId: "domain-1", hostname: "example.com", identifierType: "EXACT", position: 0 }],
    issuer: "Let's Encrypt",
    keyAlgorithm,
    notAfter: "2026-10-30T08:00:00.000Z",
    status: "ISSUED",
    updatedAt: "2026-07-30T08:00:00.000Z",
  };
}

function listenerBindingFixture({ certificateId, certificateName, id, keyAlgorithm }: {
  certificateId: string;
  certificateName: string;
  id: string;
  keyAlgorithm: "ECDSA" | "RSA";
}) {
  return {
    activatedAt: "2026-07-30T08:00:00.000Z",
    currentCertificate: {
      certName: certificateName,
      fingerprint: `${certificateId}-fingerprint`,
      identifiers: [{ domainId: "domain-1", hostname: "example.com", identifierType: "EXACT", position: 0 }],
      issuer: "Let's Encrypt",
      notAfter: "2026-10-30T08:00:00.000Z",
      status: "ISSUED",
    },
    certificateId,
    currentCertificateVersionId: `${certificateId}-version-1`,
    createdAt: "2026-07-30T08:00:00.000Z",
    domainId: "domain-1",
    id,
    isDefault: keyAlgorithm === "ECDSA",
    keyAlgorithm,
    priority: keyAlgorithm === "ECDSA" ? 10 : 20,
    siteId: "application-1",
    desiredCertificate: {
      certName: certificateName,
      fingerprint: `${certificateId}-fingerprint`,
      identifiers: [{ domainId: "domain-1", hostname: "example.com", identifierType: "EXACT", position: 0 }],
      issuer: "Let's Encrypt",
      notAfter: "2026-10-30T08:00:00.000Z",
      status: "ISSUED",
    },
    desiredCertificateVersionId: `${certificateId}-version-1`,
    status: "ACTIVE",
    updatedAt: "2026-07-30T08:00:00.000Z",
  };
}

function pageOf<T>(items: readonly T[], pageSize = 10) {
  return {
    items,
    pageInfo: {
      hasMore: false,
      mode: "offset",
      page: 1,
      pageSize,
      totalItems: String(items.length),
    },
  };
}

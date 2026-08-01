import {
  WebserverAdminSdkProvider,
  type WebserverAdminSdkClient,
} from "@sdkwork/webserver-pc-admin-core";
import {
  RootDomainManagement,
  webserverModule as domainsModule,
} from "@sdkwork/webserver-pc-admin-domains";
import { WebserverAdminShell } from "@sdkwork/webserver-pc-admin-shell";
import type { WebserverResourceRegistry } from "@sdkwork/webserver-pc-commons";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import "../../src/index.css";

const rootDomains = [
  {
    activeDeploymentCount: "2",
    boundSubdomainCount: "3",
    createdAt: "2026-07-20T03:12:00Z",
    hostname: "example.com",
    httpsSubdomainCount: "3",
    id: "root-domain-1",
    status: 1,
    subdomainCount: "4",
    updatedAt: "2026-07-30T11:38:00Z",
    verifiedSubdomainCount: "2",
  },
  {
    activeDeploymentCount: "1",
    boundSubdomainCount: "2",
    createdAt: "2026-07-22T06:00:00Z",
    hostname: "sdkwork.dev",
    httpsSubdomainCount: "1",
    id: "root-domain-2",
    status: 1,
    subdomainCount: "3",
    updatedAt: "2026-07-30T09:16:00Z",
    verifiedSubdomainCount: "2",
  },
  {
    activeDeploymentCount: "0",
    boundSubdomainCount: "0",
    createdAt: "2026-07-29T01:25:00Z",
    hostname: "example.net",
    httpsSubdomainCount: "0",
    id: "root-domain-3",
    status: 0,
    subdomainCount: "1",
    updatedAt: "2026-07-29T01:25:00Z",
    verifiedSubdomainCount: "0",
  },
] as const;

const hostnames = [
  {
    applicationId: "application-1",
    applicationName: "客户门户",
    certificateCount: "1",
    createdAt: "2026-07-20T03:20:00Z",
    hostname: "example.com",
    id: "domain-1",
    isPrimary: true,
    isVerified: true,
    latestDeployment: {
      completedAt: "2026-07-30T11:38:00Z",
      createdAt: "2026-07-30T11:37:18Z",
      environment: "production",
      id: "deployment-42",
      status: 2,
      versionTag: "v2.8.0",
    },
    recordName: "@",
    rootDomainId: "root-domain-1",
    sslEnabled: true,
    sslProvider: "letsencrypt",
    status: 1,
    updatedAt: "2026-07-30T11:38:00Z",
  },
  {
    applicationId: "application-1",
    applicationName: "客户门户",
    certificateCount: "0",
    createdAt: "2026-07-20T03:22:00Z",
    hostname: "www.example.com",
    id: "domain-2",
    isPrimary: false,
    isVerified: true,
    latestDeployment: {
      createdAt: "2026-07-30T11:42:00Z",
      environment: "production",
      id: "deployment-43",
      status: 1,
      versionTag: "v2.9.0",
    },
    recordName: "www",
    rootDomainId: "root-domain-1",
    sslEnabled: true,
    sslProvider: "letsencrypt",
    status: 1,
    updatedAt: "2026-07-30T11:42:00Z",
  },
  {
    applicationId: "application-2",
    applicationName: "开放 API",
    certificateCount: "1",
    createdAt: "2026-07-21T02:10:00Z",
    hostname: "api.example.com",
    id: "domain-3",
    isPrimary: true,
    isVerified: false,
    latestDeployment: {
      createdAt: "2026-07-30T10:05:00Z",
      environment: "production",
      id: "deployment-41",
      status: 3,
      versionTag: "v4.3.1",
    },
    recordName: "api",
    rootDomainId: "root-domain-1",
    sslEnabled: true,
    sslProvider: "letsencrypt",
    status: 0,
    updatedAt: "2026-07-30T10:05:00Z",
  },
  {
    applicationId: undefined,
    applicationName: undefined,
    certificateCount: "0",
    createdAt: "2026-07-29T08:16:00Z",
    hostname: "docs.example.com",
    id: "domain-4",
    isPrimary: false,
    isVerified: false,
    latestDeployment: undefined,
    recordName: "docs",
    rootDomainId: "root-domain-1",
    sslEnabled: false,
    sslProvider: "none",
    status: 0,
    updatedAt: "2026-07-29T08:16:00Z",
  },
] as const;

const applications = [
  { applicationType: "WEB", id: "application-1", name: "客户门户" },
  { applicationType: "API", id: "application-2", name: "开放 API" },
  { applicationType: "WEB", id: "application-3", name: "开发者文档" },
] as const;

const client = {
  application: {
    async list(query: { keyword?: string; page?: number; pageSize?: number }) {
      const keyword = query.keyword?.toLowerCase();
      const items = keyword
        ? applications.filter((application) => application.name.toLowerCase().includes(keyword))
        : applications;
      return {
        items,
        pageInfo: { hasMore: false, mode: "offset", page: 1, pageSize: 10, totalItems: String(items.length) },
      };
    },
  },
  certificate: { issue: async () => ({}) },
  domain: {
    applicationBinding: { delete: async () => undefined, update: async () => ({}) },
    delete: async () => undefined,
    rootDomains: {
      create: async () => rootDomains[0],
      delete: async () => undefined,
      async list() {
        return {
          items: rootDomains,
          pageInfo: { hasMore: false, mode: "offset", page: 1, pageSize: 20, totalItems: String(rootDomains.length) },
        };
      },
      async retrieve() { return rootDomains[0]; },
      subdomains: {
        create: async () => hostnames[0],
        async list() {
          return {
            items: hostnames,
            pageInfo: { hasMore: false, mode: "offset", page: 1, pageSize: 20, totalItems: String(hostnames.length) },
          };
        },
      },
    },
    verify: async () => ({ verified: true }),
  },
} as unknown as WebserverAdminSdkClient;

const root = document.getElementById("root");
if (!root) throw new Error("visual fixture root is required");

const query = new URLSearchParams(window.location.search);
const defaultTheme = query.get("theme") === "dark" ? "dark" : "light";
const initialPath = query.get("view") === "detail"
  ? "/admin/root-domains/root-domain-1"
  : "/admin/root-domains";

createRoot(root).render(
  <SdkworkThemeProvider className="webserver-pc-theme" defaultTheme={defaultTheme} locale="zh-CN" themeColor="green-tech">
    <WebserverAdminSdkProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/admin/*"
            element={(
              <WebserverAdminShell
                locale="zh-CN"
                modules={[domainsModule]}
                onSignOut={() => undefined}
                permissionScope={["web.sites.read", "web.sites.write", "web.certificates.write"]}
                registry={{} as WebserverResourceRegistry}
                resourceRenderers={{
                  "root-domains": <RootDomainManagement locale="zh-CN" permissionScope={["web.sites.read", "web.sites.write", "web.certificates.write"]} />,
                }}
                userLabel="域名管理员"
              />
            )}
          />
        </Routes>
      </MemoryRouter>
    </WebserverAdminSdkProvider>
  </SdkworkThemeProvider>,
);

const dialog = query.get("dialog");
if (dialog) {
  window.setTimeout(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
    const target = dialog === "unbind"
      ? buttons.find((button) => button.getAttribute("aria-label") === "解除关联")
      : buttons.find((button) => button.textContent?.includes("添加主机名"));
    target?.click();
  }, 50);
}

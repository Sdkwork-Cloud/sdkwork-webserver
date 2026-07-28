import { WebserverWorkspace, type WebserverResourceRegistry } from "@sdkwork/webserver-pc-commons";
import { webserverModule as configurationModule } from "@sdkwork/webserver-pc-console-site-configuration";
import { webserverModule as deliveryModule } from "@sdkwork/webserver-pc-console-delivery";
import { webserverModule as deploymentsModule } from "@sdkwork/webserver-pc-console-deployments";
import { webserverModule as sitesModule } from "@sdkwork/webserver-pc-console-sites";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import {
  resolveInitialWebserverTheme,
  WEBSERVER_THEME_COLOR,
  WEBSERVER_THEME_OVERRIDES,
} from "../src/bootstrap/theme.ts";
import "../src/index.css";

const sites = [
  { id: "app-1001", name: "Commerce API", applicationType: "API", siteType: "Container", status: 1, updatedAt: "2026-07-28 16:42", createdAt: "2026-06-18 09:20" },
  { id: "app-1002", name: "Customer Portal", applicationType: "WEB", siteType: "Static", status: 1, updatedAt: "2026-07-28 15:08", createdAt: "2026-06-22 11:04" },
  { id: "app-1003", name: "Documentation", applicationType: "WEB", siteType: "Static", status: 0, updatedAt: "2026-07-27 18:32", createdAt: "2026-07-01 13:46" },
  { id: "app-1004", name: "Status Page", applicationType: "WEB", siteType: "Static", status: 2, updatedAt: "2026-07-25 10:12", createdAt: "2026-07-09 08:15" },
];

const actions = [
  { id: "create", label: "Create application", bodyTemplate: { name: "" }, execute: async () => ({}) },
  { id: "update", label: "Update", bodyTemplate: { name: "" }, execute: async () => ({}), requiresSelection: true },
  { id: "activate", label: "Activate", bodyTemplate: {}, execute: async () => ({}), requiresSelection: true },
  { id: "pause", label: "Disable", bodyTemplate: {}, execute: async () => ({}), requiresSelection: true },
  { id: "delete", label: "Delete", bodyTemplate: {}, dangerous: true, execute: async () => ({}), requiresSelection: true },
] as const;

const registry: WebserverResourceRegistry = {
  sites: {
    actions,
    load: async () => ({ items: sites, pageInfo: { page: 1, pageSize: 20, total: sites.length, hasMore: false } }),
  },
  configuration: {
    actions: [],
    load: async () => ({ items: [], pageInfo: { page: 1, pageSize: 20, total: 0, hasMore: false } }),
    requiresScope: true,
  },
  domains: {
    actions: [],
    load: async () => ({ items: [], pageInfo: { page: 1, pageSize: 20, total: 0, hasMore: false } }),
    requiresScope: true,
  },
  certificates: {
    actions: [],
    load: async () => ({ items: [], pageInfo: { page: 1, pageSize: 20, total: 0, hasMore: false } }),
    requiresScope: true,
  },
  deployments: {
    actions: [],
    load: async () => ({
      items: [
        { id: "deploy-4821", environment: "production", versionTag: "v2.8.0", status: 2, artifactDriveUri: "drive://spaces/releases/nodes/release-4821", artifactSize: 5242880, startedAt: "2026-07-28 15:00", completedAt: "2026-07-28 15:01", durationMs: 18000 },
        { id: "deploy-4819", environment: "staging", versionTag: "v2.8.0-rc.2", status: 3, artifactDriveUri: "drive://spaces/releases/nodes/release-4819", artifactSize: 5173248, startedAt: "2026-07-28 13:10", completedAt: "2026-07-28 13:11", durationMs: 32000 },
      ],
      pageInfo: { page: 1, pageSize: 20, total: 2, hasMore: false },
    }),
    requiresScope: true,
  },
};

const resource = new URLSearchParams(window.location.search).get("resource") ?? "sites";
const root = document.getElementById("root");
if (!root) throw new Error("Missing root");

createRoot(root).render(
  <SdkworkThemeProvider
    className="webserver-pc-theme"
    locale="en-US"
    overrides={WEBSERVER_THEME_OVERRIDES}
    themeColor={WEBSERVER_THEME_COLOR}
    themeSelection={resolveInitialWebserverTheme()}
  >
    <MemoryRouter initialEntries={[`/console/${resource}`]}>
      <Routes>
        <Route
          path="/console/*"
          element={(
            <WebserverWorkspace
              locale="en-US"
              modules={[sitesModule, configurationModule, deliveryModule, deploymentsModule]}
              permissionScope={["web.sites.*", "web.certificates.*"]}
              portalHref="/"
              registry={registry}
              surface="app-console"
              userLabel="alex@example.com"
            />
          )}
        />
      </Routes>
    </MemoryRouter>
  </SdkworkThemeProvider>,
);

import { webserverModule as deliveryModule } from "@sdkwork/webserver-pc-console-delivery";
import { webserverModule as deploymentsModule } from "@sdkwork/webserver-pc-console-deployments";
import { webserverModule as configurationModule } from "@sdkwork/webserver-pc-console-site-configuration";
import { webserverModule as sitesModule } from "@sdkwork/webserver-pc-console-sites";
import { WebserverConsoleShell } from "@sdkwork/webserver-pc-console-shell";
import type { WebserverResourceDataSource, WebserverResourceRegistry } from "@sdkwork/webserver-pc-commons";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import "../../src/index.css";

const applications: readonly Record<string, unknown>[] = [
  {
    id: "app-customer-portal",
    name: "Customer portal",
    environment: "Production",
    status: "Healthy",
    primaryDomain: "portal.example.com",
    updatedAt: "2026-07-28 15:42",
  },
  {
    id: "app-partner-api",
    name: "Partner API",
    environment: "Staging",
    status: "Deploying",
    primaryDomain: "api-staging.example.com",
    updatedAt: "2026-07-28 15:38",
  },
  {
    id: "app-docs",
    name: "Developer documentation",
    environment: "Production",
    status: "Healthy",
    primaryDomain: "docs.example.com",
    updatedAt: "2026-07-28 14:56",
  },
];

const emptySource: WebserverResourceDataSource = {
  actions: [],
  async load(query) {
    return { items: [], pageInfo: { page: query.page, pageSize: query.pageSize, hasMore: false, total: 0 } };
  },
};

const registry: WebserverResourceRegistry = {
  sites: {
    actions: [],
    async load(query) {
      return {
        items: applications,
        pageInfo: { page: query.page, pageSize: query.pageSize, hasMore: false, total: applications.length },
      };
    },
  },
  configuration: emptySource,
  domains: emptySource,
  certificates: emptySource,
  deployments: emptySource,
};

const root = document.getElementById("root");
if (!root) throw new Error("visual fixture root is required");
const defaultTheme = new URLSearchParams(window.location.search).get("theme") === "dark" ? "dark" : "light";

createRoot(root).render(
  <SdkworkThemeProvider className="webserver-pc-theme" defaultTheme={defaultTheme} locale="en-US" themeColor="green-tech">
    <MemoryRouter initialEntries={["/console/sites"]}>
      <Routes>
        <Route
          path="/console/*"
          element={(
            <WebserverConsoleShell
              locale="en-US"
              modules={[sitesModule, configurationModule, deliveryModule, deploymentsModule]}
              notificationsHref="/notifications"
              onSignOut={() => undefined}
              permissionScope={["web.sites.*", "web.certificates.*"]}
              portalHref="/"
              registry={registry}
              userLabel="Alex Morgan"
            />
          )}
        />
      </Routes>
    </MemoryRouter>
  </SdkworkThemeProvider>,
);

import { useSdkworkAuthControllerState } from "@sdkwork/auth-pc-react";
import { webserverModule as auditModule } from "@sdkwork/webserver-pc-admin-audit";
import { webserverModule as applicationsModule } from "@sdkwork/webserver-pc-admin-applications";
import { webserverModule as certificatesModule } from "@sdkwork/webserver-pc-admin-certificates";
import { webserverModule as diagnosticsModule } from "@sdkwork/webserver-pc-admin-diagnostics";
import { webserverModule as nginxModule } from "@sdkwork/webserver-pc-admin-nginx";
import { webserverModule as serversModule } from "@sdkwork/webserver-pc-admin-servers";
import { hasWebserverAdminAccess, type WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";
import { createWebserverConsoleRegistry, WebserverConsoleSdkProvider } from "@sdkwork/webserver-pc-console-core";
import { webserverModule as deliveryModule } from "@sdkwork/webserver-pc-console-delivery";
import { webserverModule as deploymentsModule } from "@sdkwork/webserver-pc-console-deployments";
import { WebserverConsoleShell } from "@sdkwork/webserver-pc-console-shell";
import { webserverModule as configurationModule } from "@sdkwork/webserver-pc-console-site-configuration";
import { webserverModule as sitesModule } from "@sdkwork/webserver-pc-console-sites";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { portalAgentCatalog } from "@sdkwork/webserver-pc-portal";
import type { SdkworkThemeSelection } from "@sdkwork/ui-pc-react/theme";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { BootstrappedWebserverPcRuntime } from "./bootstrap/runtime.ts";
import { WebserverAuthGate } from "./auth/WebserverAuthGate.tsx";
import { browserPortalClipboard, createBrowserPortalStatistics } from "./bootstrap/portalHost.ts";
import {
  commitWebserverTheme,
  resolveInitialWebserverTheme,
  WEBSERVER_THEME_COLOR,
  WEBSERVER_THEME_OVERRIDES,
} from "./bootstrap/theme.ts";

const consoleModules = [sitesModule, configurationModule, deliveryModule, deploymentsModule] satisfies readonly WebserverPcModuleDefinition[];
const adminModules = [applicationsModule, certificatesModule, nginxModule, serversModule, diagnosticsModule, auditModule] satisfies readonly WebserverPcModuleDefinition[];
const LazyAuthRoutes = lazy(() => import("./auth/WebserverAuthRoutes.tsx").then((module) => ({ default: module.WebserverAuthRoutes })));
const LazyAdminSurface = lazy(() => import("./surfaces/WebserverAdminSurface.tsx").then((module) => ({ default: module.WebserverAdminSurface })));
const LazyWebserverDocumentation = lazy(() => import("@sdkwork/webserver-pc-documentation").then((module) => ({ default: module.WebserverDocumentation })));
const LazyWebserverPortal = lazy(() => import("@sdkwork/webserver-pc-portal").then((module) => ({ default: module.WebserverPortal })));
const supportedAgents = portalAgentCatalog.map(({ label }) => label);

export function App({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  const [themeSelection, setThemeSelection] = useState(resolveInitialWebserverTheme);

  const handleThemeSelectionChange = (nextTheme: SdkworkThemeSelection) => {
    setThemeSelection(commitWebserverTheme(nextTheme));
  };

  return (
    <SdkworkThemeProvider
      className="webserver-pc-theme"
      locale={runtime.locale}
      onThemeSelectionChange={handleThemeSelectionChange}
      overrides={WEBSERVER_THEME_OVERRIDES}
      themeColor={WEBSERVER_THEME_COLOR}
      themeSelection={themeSelection}
    >
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<PublicPortalApplication runtime={runtime} />}
          />
          <Route
            path="/docs/*"
            element={<PublicDocumentationApplication runtime={runtime} />}
          />
          <Route path="/*" element={<AuthenticatedApplication runtime={runtime} />} />
        </Routes>
      </BrowserRouter>
    </SdkworkThemeProvider>
  );
}

function PublicPortalApplication({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  const authState = usePublicAuthState(runtime);
  const statistics = useMemo(
    () => createBrowserPortalStatistics(runtime.consoleClients.web),
    [runtime.consoleClients.web],
  );

  const viewer = authState.isAuthenticated
    ? { label: authState.user?.displayName || authState.user?.email }
    : undefined;

  return (
    <Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}>
      <LazyWebserverPortal
        clipboard={browserPortalClipboard}
        locale={runtime.locale}
        navigation={{
          consoleHref: "/console",
          createApplicationHref: "/console/sites",
          deploymentsHref: "/console/deployments",
          documentationHref: "/docs",
          notificationsHref: runtime.config.messagingPcUrl,
        }}
        statistics={authState.isAuthenticated ? statistics : undefined}
        viewer={viewer}
      />
    </Suspense>
  );
}

function PublicDocumentationApplication({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  const authState = usePublicAuthState(runtime);
  const viewer = authState.isAuthenticated
    ? { label: authState.user?.displayName || authState.user?.email }
    : undefined;

  return (
    <Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}>
      <LazyWebserverDocumentation
        locale={runtime.locale}
        navigation={{
          consoleHref: "/console",
          notificationsHref: runtime.config.messagingPcUrl,
          portalHref: "/",
        }}
        supportedAgents={supportedAgents}
        viewer={viewer}
      />
    </Suspense>
  );
}

function usePublicAuthState(runtime: BootstrappedWebserverPcRuntime) {
  const authState = useSdkworkAuthControllerState(runtime.authController);

  useEffect(() => {
    if (authState.isBootstrapped) return;
    void runtime.authController.bootstrap().catch(() => undefined);
  }, [authState.isBootstrapped, runtime.authController]);

  return authState;
}

function AuthenticatedApplication({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  const authState = useSdkworkAuthControllerState(runtime.authController);
  const registry = useMemo(() => createWebserverConsoleRegistry(runtime.consoleClients), [runtime.consoleClients]);
  const permissionScope = authState.session?.context?.permissionScope ?? [];
  const adminAccess = hasWebserverAdminAccess(permissionScope);
  const landingPath = adminAccess ? "/admin" : "/console";
  const userLabel = authState.user?.displayName || authState.user?.email;
  const signOut = () => { void runtime.authController.signOut(); };
  return (
    <WebserverAuthGate
      authRoutes={(
        <Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}>
          <LazyAuthRoutes
            controller={runtime.authController}
            loadRuntimeConfig={runtime.loadAuthRuntimeConfig}
            locale={runtime.locale}
          />
        </Suspense>
      )}
      controller={runtime.authController}
      locale={runtime.locale}
    >
      <WebserverConsoleSdkProvider clients={runtime.consoleClients}>
        <Routes>
          <Route
            path="/console/*"
            element={(
              <WebserverConsoleShell
                locale={runtime.locale}
                modules={consoleModules}
                notificationsHref={runtime.config.messagingPcUrl}
                onSignOut={signOut}
                permissionScope={permissionScope}
                portalHref="/"
                registry={registry}
                userLabel={userLabel}
              />
            )}
          />
          <Route
            path="/admin/*"
            element={adminAccess ? (
              <Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}>
                <LazyAdminSurface
                  backendApiBaseUrl={runtime.config.backendApiBaseUrl}
                  locale={runtime.locale}
                  modules={adminModules}
                  onSignOut={signOut}
                  permissionScope={permissionScope}
                  tokenManager={runtime.tokenManager}
                  userLabel={userLabel}
                />
              </Suspense>
            ) : <Navigate to="/console" replace />}
          />
          <Route path="*" element={<Navigate to={landingPath} replace />} />
        </Routes>
      </WebserverConsoleSdkProvider>
    </WebserverAuthGate>
  );
}

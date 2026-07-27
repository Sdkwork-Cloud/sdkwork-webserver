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
import type { SdkworkThemeSelection } from "@sdkwork/ui-pc-react/theme";
import { lazy, Suspense, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { BootstrappedWebserverPcRuntime } from "./bootstrap/runtime.ts";
import { WebserverAuthGate } from "./auth/WebserverAuthGate.tsx";
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
        <AuthenticatedApplication runtime={runtime} />
      </BrowserRouter>
    </SdkworkThemeProvider>
  );
}
function AuthenticatedApplication({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  const authState = useSdkworkAuthControllerState(runtime.authController);
  const registry = useMemo(() => createWebserverConsoleRegistry(runtime.consoleClients), [runtime.consoleClients]);
  const permissionScope = authState.session?.context?.permissionScope ?? [];
  const adminAccess = hasWebserverAdminAccess(permissionScope);
  const landingPath = adminAccess ? "/admin" : "/console";
  const userLabel = authState.user?.displayName || authState.user?.email;
  const signOut = () => { void runtime.authController.signOut(); };
  return <WebserverAuthGate controller={runtime.authController} locale={runtime.locale} authRoutes={<Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}><LazyAuthRoutes controller={runtime.authController} loadRuntimeConfig={runtime.loadAuthRuntimeConfig} locale={runtime.locale} /></Suspense>}><WebserverConsoleSdkProvider clients={runtime.consoleClients}><Routes><Route path="/console/*" element={<WebserverConsoleShell locale={runtime.locale} modules={consoleModules} permissionScope={permissionScope} registry={registry} userLabel={userLabel} onSignOut={signOut} />} /><Route path="/admin/*" element={adminAccess ? <Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}><LazyAdminSurface backendApiBaseUrl={runtime.config.backendApiBaseUrl} locale={runtime.locale} modules={adminModules} permissionScope={permissionScope} tokenManager={runtime.tokenManager} userLabel={userLabel} onSignOut={signOut} /></Suspense> : <Navigate to="/console" replace />} /><Route path="*" element={<Navigate to={landingPath} replace />} /></Routes></WebserverConsoleSdkProvider></WebserverAuthGate>;
}

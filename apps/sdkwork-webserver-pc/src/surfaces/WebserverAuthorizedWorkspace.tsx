import { useSdkworkAuthControllerState } from "@sdkwork/auth-pc-react";
import { webserverModule as auditModule } from "@sdkwork/webserver-pc-admin-audit";
import { webserverModule as applicationsModule } from "@sdkwork/webserver-pc-admin-applications";
import { webserverModule as certificatesModule } from "@sdkwork/webserver-pc-admin-certificates";
import { webserverModule as diagnosticsModule } from "@sdkwork/webserver-pc-admin-diagnostics";
import { webserverModule as nginxModule } from "@sdkwork/webserver-pc-admin-nginx";
import { webserverModule as serversModule } from "@sdkwork/webserver-pc-admin-servers";
import { hasWebserverAdminAccess, type WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";
import { createApplicationMediaStorage, createApplicationSourceStorage, createWebserverConsoleRegistry, WebserverConsoleSdkProvider } from "@sdkwork/webserver-pc-console-core";
import { webserverModule as deliveryModule } from "@sdkwork/webserver-pc-console-delivery";
import { webserverModule as deploymentsModule } from "@sdkwork/webserver-pc-console-deployments";
import { WebserverConsoleShell } from "@sdkwork/webserver-pc-console-shell";
import { webserverModule as configurationModule } from "@sdkwork/webserver-pc-console-site-configuration";
import { webserverModule as sitesModule } from "@sdkwork/webserver-pc-console-sites";
import { lazy, Suspense, use, useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { BootstrappedWebserverPcRuntime } from "../bootstrap/runtime.ts";

const consoleModules = [sitesModule, configurationModule, deliveryModule, deploymentsModule] satisfies readonly WebserverPcModuleDefinition[];
const adminModules = [applicationsModule, certificatesModule, nginxModule, serversModule, diagnosticsModule, auditModule] satisfies readonly WebserverPcModuleDefinition[];
const LazyAdminSurface = lazy(() => import("./WebserverAdminSurface.tsx").then((module) => ({ default: module.WebserverAdminSurface })));

export function WebserverAuthorizedWorkspace({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  const authState = useSdkworkAuthControllerState(runtime.authController);
  const consoleClients = use(runtime.loadConsoleClients());
  const sourceStorage = useMemo(
    () => createApplicationSourceStorage(consoleClients.drive),
    [consoleClients.drive],
  );
  const mediaStorage = useMemo(
    () => createApplicationMediaStorage(consoleClients.drive),
    [consoleClients.drive],
  );
  const registry = useMemo(
    () => createWebserverConsoleRegistry(consoleClients, sourceStorage, mediaStorage),
    [consoleClients, mediaStorage, sourceStorage],
  );
  const permissionScope = authState.session?.context?.permissionScope ?? [];
  const adminAccess = hasWebserverAdminAccess(permissionScope);
  const landingPath = adminAccess ? "/admin" : "/console";
  const userLabel = authState.user?.displayName || authState.user?.email;
  const signOut = () => { void runtime.authController.signOut(); };

  return (
    <WebserverConsoleSdkProvider clients={consoleClients}>
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
                mediaStorage={mediaStorage}
                modules={adminModules}
                onSignOut={signOut}
                permissionScope={permissionScope}
                sourceStorage={sourceStorage}
                tokenManager={runtime.tokenManager}
                userLabel={userLabel}
              />
            </Suspense>
          ) : <Navigate to="/console" replace />}
        />
        <Route path="*" element={<Navigate to={landingPath} replace />} />
      </Routes>
    </WebserverConsoleSdkProvider>
  );
}

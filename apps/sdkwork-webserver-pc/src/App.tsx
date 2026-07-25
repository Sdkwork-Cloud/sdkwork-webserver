import { useSdkworkAuthControllerState } from "@sdkwork/auth-pc-react";
import { webserverModule as auditModule } from "@sdkwork/webserver-pc-admin-audit";
import { webserverModule as diagnosticsModule } from "@sdkwork/webserver-pc-admin-diagnostics";
import { webserverModule as nginxModule } from "@sdkwork/webserver-pc-admin-nginx";
import { webserverModule as serversModule } from "@sdkwork/webserver-pc-admin-servers";
import type { WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";
import { createWebserverConsoleRegistry, WebserverConsoleSdkProvider } from "@sdkwork/webserver-pc-console-core";
import { webserverModule as deliveryModule } from "@sdkwork/webserver-pc-console-delivery";
import { webserverModule as deploymentsModule } from "@sdkwork/webserver-pc-console-deployments";
import { WebserverConsoleShell } from "@sdkwork/webserver-pc-console-shell";
import { webserverModule as configurationModule } from "@sdkwork/webserver-pc-console-site-configuration";
import { webserverModule as sitesModule } from "@sdkwork/webserver-pc-console-sites";
import { lazy, Suspense, useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { BootstrappedWebserverPcRuntime } from "./bootstrap/runtime.ts";
import { WebserverAuthGate } from "./auth/WebserverAuthGate.tsx";

const consoleModules = [sitesModule, configurationModule, deliveryModule, deploymentsModule] satisfies readonly WebserverPcModuleDefinition[];
const adminModules = [nginxModule, serversModule, diagnosticsModule, auditModule] satisfies readonly WebserverPcModuleDefinition[];
const LazyAuthRoutes = lazy(() => import("./auth/WebserverAuthRoutes.tsx").then((module) => ({ default: module.WebserverAuthRoutes })));
const LazyAdminSurface = lazy(() => import("./surfaces/WebserverAdminSurface.tsx").then((module) => ({ default: module.WebserverAdminSurface })));

export function App({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) { return <BrowserRouter><AuthenticatedApplication runtime={runtime} /></BrowserRouter>; }
function AuthenticatedApplication({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  const authState = useSdkworkAuthControllerState(runtime.authController);
  const registry = useMemo(() => createWebserverConsoleRegistry(runtime.appClient), [runtime.appClient]);
  const permissionScope = authState.session?.context?.permissionScope ?? [];
  const userLabel = authState.user?.displayName || authState.user?.email;
  const signOut = () => { void runtime.authController.signOut(); };
  return <WebserverAuthGate controller={runtime.authController} authRoutes={<Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}><LazyAuthRoutes controller={runtime.authController} /></Suspense>}><WebserverConsoleSdkProvider client={runtime.appClient}><Routes><Route path="/console/*" element={<WebserverConsoleShell locale={runtime.locale} modules={consoleModules} permissionScope={permissionScope} registry={registry} userLabel={userLabel} onSignOut={signOut} />} /><Route path="/admin/*" element={<Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}><LazyAdminSurface backendApiBaseUrl={runtime.config.backendApiBaseUrl} locale={runtime.locale} modules={adminModules} permissionScope={permissionScope} tokenManager={runtime.tokenManager} userLabel={userLabel} onSignOut={signOut} /></Suspense>} /><Route path="*" element={<Navigate to="/console" replace />} /></Routes></WebserverConsoleSdkProvider></WebserverAuthGate>;
}

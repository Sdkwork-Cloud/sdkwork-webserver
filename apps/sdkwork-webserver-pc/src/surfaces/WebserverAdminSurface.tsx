import { createWebserverAdminRegistry, createWebserverAdminSdkClient, WebserverAdminSdkProvider } from "@sdkwork/webserver-pc-admin-core";
import { createWebserverAdminApplicationRegistry } from "@sdkwork/webserver-pc-admin-applications";
import { createWebserverAdminCertificateRegistry } from "@sdkwork/webserver-pc-admin-certificates";
import { WebserverAdminShell } from "@sdkwork/webserver-pc-admin-shell";
import type { WebserverLocale, WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import { useMemo } from "react";

export interface WebserverAdminSurfaceProps {
  backendApiBaseUrl: string;
  locale: WebserverLocale;
  modules: readonly WebserverPcModuleDefinition[];
  onSignOut(): void;
  permissionScope: readonly string[];
  tokenManager: AuthTokenManager;
  userLabel?: string;
}

export function WebserverAdminSurface({ backendApiBaseUrl, locale, modules, onSignOut, permissionScope, tokenManager, userLabel }: WebserverAdminSurfaceProps) {
  const client = useMemo(() => createWebserverAdminSdkClient(backendApiBaseUrl, tokenManager), [backendApiBaseUrl, tokenManager]);
  const registry = useMemo(() => ({
    ...createWebserverAdminRegistry(client),
    ...createWebserverAdminApplicationRegistry(client),
    ...createWebserverAdminCertificateRegistry(client),
  }), [client]);
  return <WebserverAdminSdkProvider client={client}><WebserverAdminShell locale={locale} modules={modules} permissionScope={permissionScope} registry={registry} userLabel={userLabel} onSignOut={onSignOut} /></WebserverAdminSdkProvider>;
}

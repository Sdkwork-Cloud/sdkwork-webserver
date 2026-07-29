import { createWebserverAdminRegistry, createWebserverAdminSdkClient, WebserverAdminSdkProvider } from "@sdkwork/webserver-pc-admin-core";
import { createWebserverAdminApplicationRegistry } from "@sdkwork/webserver-pc-admin-applications";
import { createWebserverAdminCertificateRegistry } from "@sdkwork/webserver-pc-admin-certificates";
import { WebserverAdminShell } from "@sdkwork/webserver-pc-admin-shell";
import type { ApplicationMediaStorage, ApplicationSourceStorage, WebserverLocale, WebserverPcModuleDefinition } from "@sdkwork/webserver-pc-commons";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import { useMemo } from "react";

export interface WebserverAdminSurfaceProps {
  backendApiBaseUrl: string;
  locale: WebserverLocale;
  mediaStorage: ApplicationMediaStorage;
  modules: readonly WebserverPcModuleDefinition[];
  onSignOut(): void;
  permissionScope: readonly string[];
  sourceStorage: ApplicationSourceStorage;
  tokenManager: AuthTokenManager;
  userLabel?: string;
}

export function WebserverAdminSurface({ backendApiBaseUrl, locale, mediaStorage, modules, onSignOut, permissionScope, sourceStorage, tokenManager, userLabel }: WebserverAdminSurfaceProps) {
  const client = useMemo(() => createWebserverAdminSdkClient(backendApiBaseUrl, tokenManager), [backendApiBaseUrl, tokenManager]);
  const registry = useMemo(() => ({
    ...createWebserverAdminRegistry(client),
    ...createWebserverAdminApplicationRegistry(client, sourceStorage, mediaStorage),
    ...createWebserverAdminCertificateRegistry(client),
  }), [client, mediaStorage, sourceStorage]);
  return <WebserverAdminSdkProvider client={client}><WebserverAdminShell locale={locale} modules={modules} permissionScope={permissionScope} registry={registry} userLabel={userLabel} onSignOut={onSignOut} /></WebserverAdminSdkProvider>;
}

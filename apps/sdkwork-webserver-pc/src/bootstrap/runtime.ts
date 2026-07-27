import { createSdkworkIamRuntimeAuthController, type SdkworkIamRuntimeAuthRuntimeLike } from "@sdkwork/auth-pc-react";
import { createSdkworkAppbasePcAuthRuntime } from "@sdkwork/auth-runtime-pc-react";
import { createClient as createIamAppClient } from "@sdkwork/iam-app-sdk";
import { createPersistentIamTokenStore } from "@sdkwork/iam-runtime";
import { createTokenManager } from "@sdkwork/sdk-common";
import { createWebserverConsoleSdkClients } from "@sdkwork/webserver-pc-console-core";
import { loadWebserverPcRuntimeConfig, resolveWebserverLocale } from "@sdkwork/webserver-pc-core";
import { createWebserverAuthRuntimeConfigLoader } from "../auth/authRuntimeConfig.ts";

const WEBSERVER_PC_APP_ID = "sdkwork-webserver-pc";

export async function bootstrapWebserverPcRuntime() {
  const config = await loadWebserverPcRuntimeConfig();
  const locale = resolveWebserverLocale(config, navigator.languages);
  const tokenManager = createTokenManager();
  // The shared IAM store owns authToken/accessToken persistence; app code never reads credentials.
  const tokenStore = createPersistentIamTokenStore({
    appId: WEBSERVER_PC_APP_ID,
    storage: window.localStorage,
  });
  const consoleClients = createWebserverConsoleSdkClients({
    driveAppApiBaseUrl: config.driveAppApiBaseUrl,
    webAppApiBaseUrl: config.appApiBaseUrl,
  }, tokenManager);
  const auth = createSdkworkAppbasePcAuthRuntime({
    app: { appId: WEBSERVER_PC_APP_ID, deploymentMode: config.deploymentProfile === "cloud" ? "saas" : "local", environment: config.environment === "development" ? "dev" : config.environment === "test" ? "test" : "prod", platform: "pc" },
    baseUrls: { appbaseAppApiBaseUrl: config.appbaseAppApiBaseUrl },
    createAppbaseAppClient: (clientConfig) => createIamAppClient({ ...clientConfig, timeout: config.environment === "production" || config.environment === "staging" ? 10_000 : 5_000 }),
    localeProvider: () => locale,
    sdkClients: [consoleClients.web, consoleClients.drive],
    sessionAuth: true,
    tokenManager,
    tokenStore,
  });
  await auth.runtime.hydrateTokenManager();
  const getAuthRuntime = () => auth.getRuntime() as unknown as SdkworkIamRuntimeAuthRuntimeLike;
  const authController = createSdkworkIamRuntimeAuthController({ getRuntime: getAuthRuntime });
  const loadAuthRuntimeConfig = createWebserverAuthRuntimeConfigLoader(auth.appbaseApp);
  return { appClient: consoleClients.web, auth, authController, config, consoleClients, loadAuthRuntimeConfig, locale, tokenManager } as const;
}

export type BootstrappedWebserverPcRuntime = Awaited<ReturnType<typeof bootstrapWebserverPcRuntime>>;

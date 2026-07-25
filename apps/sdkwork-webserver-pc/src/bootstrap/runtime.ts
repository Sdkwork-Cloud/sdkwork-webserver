import { createSdkworkIamRuntimeAuthController, type SdkworkIamRuntimeAuthRuntimeLike } from "@sdkwork/auth-pc-react";
import { createSdkworkAppbasePcAuthRuntime } from "@sdkwork/auth-runtime-pc-react";
import { createClient as createIamAppClient } from "@sdkwork/iam-app-sdk";
import { createTokenManager } from "@sdkwork/sdk-common";
import { createWebserverConsoleSdkClient } from "@sdkwork/webserver-pc-console-core";
import { loadWebserverPcRuntimeConfig, resolveWebserverLocale } from "@sdkwork/webserver-pc-core";

export async function bootstrapWebserverPcRuntime() {
  const config = await loadWebserverPcRuntimeConfig();
  const locale = resolveWebserverLocale(config, navigator.languages);
  const tokenManager = createTokenManager();
  const appClient = createWebserverConsoleSdkClient(config.appApiBaseUrl, tokenManager);
  const auth = createSdkworkAppbasePcAuthRuntime({
    app: { appId: "sdkwork-webserver-pc", deploymentMode: config.deploymentProfile === "cloud" ? "saas" : "local", environment: config.environment === "development" ? "dev" : config.environment === "test" ? "test" : "prod", platform: "pc" },
    baseUrls: { appbaseAppApiBaseUrl: config.appbaseAppApiBaseUrl },
    createAppbaseAppClient: (clientConfig) => createIamAppClient({ ...clientConfig, timeout: config.environment === "production" || config.environment === "staging" ? 10_000 : 5_000 }),
    localeProvider: () => locale,
    sdkClients: [appClient],
    sessionAuth: true,
    tokenManager,
  });
  const getAuthRuntime = () => auth.getRuntime() as unknown as SdkworkIamRuntimeAuthRuntimeLike;
  const authController = createSdkworkIamRuntimeAuthController({ getRuntime: getAuthRuntime });
  return { appClient, auth, authController, config, locale, tokenManager } as const;
}

export type BootstrappedWebserverPcRuntime = Awaited<ReturnType<typeof bootstrapWebserverPcRuntime>>;

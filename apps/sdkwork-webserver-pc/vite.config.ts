import tailwindcss from "@tailwindcss/vite";
import { createSdkworkCredentialEntryBootstrapVitePlugin } from "@sdkwork/iam-credential-entry/vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import {
  createCanonicalApiProxyConfig,
  resolveBrowserDevelopmentServer,
  resolveViteRuntimeProfile,
} from "./scripts/browser-topology.mjs";

const APP_ROOT = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ command, mode }) => {
  const runtimeProfile = resolveViteRuntimeProfile(mode, env);
  const developmentServer = command === "serve" && runtimeProfile.environment === "development"
    ? resolveBrowserDevelopmentServer({
        appRoot: APP_ROOT,
        deploymentProfile: runtimeProfile.deploymentProfile,
        environment: runtimeProfile.environment,
        processEnv: env,
      })
    : undefined;

  return {
    plugins: [
      react(),
      tailwindcss(),
      createSdkworkCredentialEntryBootstrapVitePlugin({
        accessToken: env.SDKWORK_ACCESS_TOKEN,
        environment: runtimeProfile.environment,
      }),
    ],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: developmentServer ? {
      host: developmentServer.host,
      port: developmentServer.port,
      proxy: developmentServer.proxyTarget
        ? createCanonicalApiProxyConfig(developmentServer.proxyTarget)
        : undefined,
      strictPort: true,
    } : undefined,
    build: {
      sourcemap: true,
      target: "es2022",
    },
  };
});

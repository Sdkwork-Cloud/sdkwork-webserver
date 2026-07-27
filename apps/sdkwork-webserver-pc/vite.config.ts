import tailwindcss from "@tailwindcss/vite";
import { createSdkworkCredentialEntryBootstrapVitePlugin } from "@sdkwork/iam-credential-entry/vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    createSdkworkCredentialEntryBootstrapVitePlugin({
      accessToken: env.SDKWORK_ACCESS_TOKEN,
      environment: mode,
    }),
  ],
  server: {
    port: 5182,
    strictPort: false,
  },
  preview: {
    port: 4182,
  },
  build: {
    sourcemap: true,
    target: "es2022",
  },
}));

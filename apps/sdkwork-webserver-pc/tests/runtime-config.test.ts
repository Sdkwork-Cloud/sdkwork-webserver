import { describe, expect, it } from "vitest";
import { parseWebserverPcRuntimeConfig } from "@sdkwork/webserver-pc-core";
describe("webserver runtime config", () => {
  const locales = { defaultLocale: "zh-CN", fallbackLocale: "en-US", supportedLocales: ["zh-CN", "en-US"], activeLocales: ["zh-CN", "en-US"] };
  it("accepts a complete development profile", () => { expect(parseWebserverPcRuntimeConfig({ ...locales, environment: "development", deploymentProfile: "standalone", appApiBaseUrl: "http://127.0.0.1:8080", backendApiBaseUrl: "http://127.0.0.1:8080", driveAppApiBaseUrl: "http://127.0.0.1:3900", appbaseAppApiBaseUrl: "http://127.0.0.1:8080" }).deploymentProfile).toBe("standalone"); });
  it("rejects production loopback endpoints", () => { expect(() => parseWebserverPcRuntimeConfig({ ...locales, environment: "production", deploymentProfile: "cloud", appApiBaseUrl: "http://127.0.0.1:8080", backendApiBaseUrl: "https://web.sdkwork.com", driveAppApiBaseUrl: "https://api.sdkwork.com", appbaseAppApiBaseUrl: "https://iam.sdkwork.com" })).toThrow(/loopback/); });
});

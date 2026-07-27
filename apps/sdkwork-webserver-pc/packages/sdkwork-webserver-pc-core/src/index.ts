export type WebserverLifecycleEnvironment = "development" | "test" | "staging" | "production";
export type WebserverDeploymentProfile = "standalone" | "cloud";
export type WebserverLocale = "en-US" | "zh-CN";

export interface WebserverPcRuntimeConfig {
  activeLocales: WebserverLocale[];
  appApiBaseUrl: string;
  appbaseAppApiBaseUrl: string;
  backendApiBaseUrl: string;
  driveAppApiBaseUrl: string;
  defaultLocale: WebserverLocale;
  deploymentProfile: WebserverDeploymentProfile;
  environment: WebserverLifecycleEnvironment;
  fallbackLocale: WebserverLocale;
  supportedLocales: WebserverLocale[];
}

export async function loadWebserverPcRuntimeConfig(fetcher: typeof fetch = fetch): Promise<WebserverPcRuntimeConfig> {
  const response = await fetcher("/runtime-env.json", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Runtime configuration failed with HTTP ${response.status}`);
  return parseWebserverPcRuntimeConfig(await response.json());
}

export function parseWebserverPcRuntimeConfig(value: unknown): WebserverPcRuntimeConfig {
  if (!isRecord(value)) throw new Error("Runtime configuration must be an object");
  const environment = readEnum(value.environment, ["development", "test", "staging", "production"] as const, "environment");
  const supportedLocales = readLocales(value.supportedLocales, "supportedLocales");
  const activeLocales = readLocales(value.activeLocales, "activeLocales");
  const defaultLocale = readEnum(value.defaultLocale, ["en-US", "zh-CN"] as const, "defaultLocale");
  const fallbackLocale = readEnum(value.fallbackLocale, ["en-US", "zh-CN"] as const, "fallbackLocale");
  if (!supportedLocales.includes(defaultLocale) || !supportedLocales.includes(fallbackLocale) || activeLocales.some((locale) => !supportedLocales.includes(locale))) throw new Error("Locale configuration is inconsistent");
  return { activeLocales, appApiBaseUrl: readUrl(value.appApiBaseUrl, "appApiBaseUrl", environment), appbaseAppApiBaseUrl: readUrl(value.appbaseAppApiBaseUrl, "appbaseAppApiBaseUrl", environment), backendApiBaseUrl: readUrl(value.backendApiBaseUrl, "backendApiBaseUrl", environment), driveAppApiBaseUrl: readUrl(value.driveAppApiBaseUrl, "driveAppApiBaseUrl", environment), defaultLocale, deploymentProfile: readEnum(value.deploymentProfile, ["standalone", "cloud"] as const, "deploymentProfile"), environment, fallbackLocale, supportedLocales };
}

export function resolveWebserverLocale(config: WebserverPcRuntimeConfig, preferredLocales: readonly string[]): WebserverLocale {
  for (const preferred of preferredLocales) {
    const normalized = preferred.toLowerCase().startsWith("zh") ? "zh-CN" : preferred.toLowerCase().startsWith("en") ? "en-US" : undefined;
    if (normalized && config.activeLocales.includes(normalized)) return normalized;
  }
  return config.activeLocales.includes(config.defaultLocale) ? config.defaultLocale : config.fallbackLocale;
}

function readUrl(value: unknown, field: string, environment: WebserverLifecycleEnvironment): string { if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`); const url = new URL(value); if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${field} must use HTTP or HTTPS`); if (environment === "production" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw new Error(`${field} cannot use a loopback host in production`); return url.toString().replace(/\/$/, ""); }
function readLocales(value: unknown, field: string): WebserverLocale[] { if (!Array.isArray(value) || value.length === 0) throw new Error(`${field} is required`); return [...new Set(value.map((locale) => readEnum(locale, ["en-US", "zh-CN"] as const, field)))]; }
function readEnum<const T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] { if (typeof value !== "string" || !allowed.includes(value)) throw new Error(`${field} is invalid`); return value as T[number]; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

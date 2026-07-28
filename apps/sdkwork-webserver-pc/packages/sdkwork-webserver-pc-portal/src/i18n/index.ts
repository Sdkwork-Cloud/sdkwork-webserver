import { webserverPortalLandingEnUs } from "./en-US/infrastructure/portal/landing.ts";
import { webserverPortalLandingZhCn } from "./zh-CN/infrastructure/portal/landing.ts";
import type { PortalLocale } from "../types.ts";

export type PortalMessageKey = keyof typeof webserverPortalLandingEnUs;

export const webserverPortalI18nMessages = {
  "en-US": webserverPortalLandingEnUs,
  "zh-CN": webserverPortalLandingZhCn,
} satisfies Record<PortalLocale, Record<PortalMessageKey, string>>;


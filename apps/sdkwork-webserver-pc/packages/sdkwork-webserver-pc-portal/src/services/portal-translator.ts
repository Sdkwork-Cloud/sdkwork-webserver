import {
  webserverPortalI18nMessages,
  type PortalMessageKey,
} from "../i18n/index.ts";
import type { PortalLocale } from "../types.ts";

export type PortalTranslator = (
  key: PortalMessageKey,
  values?: Readonly<Record<string, number | string>>,
) => string;

export function createPortalTranslator(locale: PortalLocale): PortalTranslator {
  return (key, values = {}) => {
    let result: string = webserverPortalI18nMessages[locale][key];
    for (const [name, value] of Object.entries(values)) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  };
}


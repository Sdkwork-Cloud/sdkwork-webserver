import {
  webserverDocumentationI18nMessages,
  type DocumentationMessageKey,
} from "../i18n/index.ts";
import type { DocumentationLocale } from "../types.ts";

export type DocumentationTranslator = (
  key: DocumentationMessageKey,
  values?: Readonly<Record<string, number | string>>,
) => string;

export function createDocumentationTranslator(locale: DocumentationLocale): DocumentationTranslator {
  return (key, values = {}) => {
    let result: string = webserverDocumentationI18nMessages[locale][key];
    for (const [name, value] of Object.entries(values)) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  };
}

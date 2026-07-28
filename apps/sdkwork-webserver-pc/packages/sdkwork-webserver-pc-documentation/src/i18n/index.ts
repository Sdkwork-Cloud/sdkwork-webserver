import type { DocumentationLocale } from "../types.ts";
import { webserverDocumentationGuideEnUs } from "./en-US/infrastructure/documentation/guide.ts";
import { webserverDocumentationGuideZhCn } from "./zh-CN/infrastructure/documentation/guide.ts";

export type DocumentationMessageKey = keyof typeof webserverDocumentationGuideEnUs;

export const webserverDocumentationI18nMessages = {
  "en-US": webserverDocumentationGuideEnUs,
  "zh-CN": webserverDocumentationGuideZhCn,
} satisfies Record<DocumentationLocale, Record<DocumentationMessageKey, string>>;

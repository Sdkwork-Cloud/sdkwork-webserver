export type DocumentationLocale = "en-US" | "zh-CN";

export interface DocumentationNavigation {
  consoleHref: string;
  notificationsHref: string;
  portalHref: string;
}

export interface DocumentationViewer {
  label?: string;
}

export interface WebserverDocumentationProps {
  locale: DocumentationLocale;
  navigation: DocumentationNavigation;
  supportedAgents: readonly string[];
  viewer?: DocumentationViewer;
}

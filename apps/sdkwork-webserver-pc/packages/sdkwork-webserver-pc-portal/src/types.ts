export type PortalAgent = "claude-code" | "codex" | "opencode" | "workbuddy";

export type PortalLocale = "en-US" | "zh-CN";

export interface PortalClipboardPort {
  writeText(value: string): Promise<void>;
}

export interface PortalNavigation {
  consoleHref: string;
  createApplicationHref: string;
  deploymentsHref: string;
  notificationsHref: string;
}

export interface PortalViewer {
  label?: string;
}

export interface WebserverPortalProps {
  clipboard: PortalClipboardPort;
  locale: PortalLocale;
  navigation: PortalNavigation;
  viewer?: PortalViewer;
}

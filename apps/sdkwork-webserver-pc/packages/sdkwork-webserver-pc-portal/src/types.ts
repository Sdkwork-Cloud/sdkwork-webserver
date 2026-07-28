export type PortalAgent =
  | "claude-code"
  | "codex"
  | "herms-agent"
  | "openclaw"
  | "opencode"
  | "qoder-work"
  | "workbuddy";

export type PortalLocale = "en-US" | "zh-CN";

export interface PortalClipboardPort {
  writeText(value: string): Promise<void>;
}

export interface PortalNavigation {
  consoleHref: string;
  createApplicationHref: string;
  deploymentsHref: string;
  documentationHref: string;
  notificationsHref: string;
}

export interface PortalStatisticsSnapshot {
  deployedApplications: string;
}

export interface PortalStatisticsPort {
  load(): Promise<PortalStatisticsSnapshot>;
}

export interface PortalViewer {
  label?: string;
}

export interface WebserverPortalProps {
  clipboard: PortalClipboardPort;
  locale: PortalLocale;
  navigation: PortalNavigation;
  statistics?: PortalStatisticsPort;
  viewer?: PortalViewer;
}

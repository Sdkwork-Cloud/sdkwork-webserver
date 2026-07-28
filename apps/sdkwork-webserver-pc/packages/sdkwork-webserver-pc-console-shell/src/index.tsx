import { WebserverWorkspace, type WebserverWorkspaceProps } from "@sdkwork/webserver-pc-commons";

export interface WebserverConsoleShellProps extends Omit<WebserverWorkspaceProps, "portalHref" | "surface"> {
  portalHref: string;
}

export function WebserverConsoleShell(props: WebserverConsoleShellProps) {
  return <WebserverWorkspace {...props} surface="app-console" />;
}

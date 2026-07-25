import { WebserverWorkspace, type WebserverWorkspaceProps } from "@sdkwork/webserver-pc-commons";
export function WebserverConsoleShell(props: Omit<WebserverWorkspaceProps, "surface">) { return <WebserverWorkspace {...props} surface="app-console" />; }

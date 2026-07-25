import { WebserverWorkspace, type WebserverWorkspaceProps } from "@sdkwork/webserver-pc-commons";
export function WebserverAdminShell(props: Omit<WebserverWorkspaceProps, "surface">) { return <WebserverWorkspace {...props} surface="backend-admin" />; }

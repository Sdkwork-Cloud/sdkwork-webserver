export type WebserverPcSurface = "app-console" | "backend-admin";

export type WebserverResourceKey =
  | "sites"
  | "configuration"
  | "domains"
  | "certificates"
  | "deployments"
  | "nginx"
  | "servers"
  | "diagnostics"
  | "audit";

export interface WebserverModuleEntry {
  description: string;
  label: string;
  order: number;
  permission: string;
  resource: WebserverResourceKey;
}

export interface WebserverPcModuleDefinition {
  entries: readonly WebserverModuleEntry[];
  id: string;
  label: string;
  surface: WebserverPcSurface;
}

export interface WebserverPageInfo {
  hasMore: boolean;
  page: number;
  pageSize: number;
  total?: number;
}

export interface WebserverResourcePage {
  items: readonly Record<string, unknown>[];
  pageInfo: WebserverPageInfo;
}

export interface WebserverResourceQuery {
  page: number;
  pageSize: number;
  scopeId?: string;
  search?: string;
}

export interface WebserverResourceActionContext {
  body: Record<string, unknown>;
  selectedItem?: Record<string, unknown>;
  scopeId?: string;
}

export interface WebserverResourceAction {
  bodyTemplate: Record<string, unknown>;
  dangerous?: boolean;
  execute(context: WebserverResourceActionContext): Promise<unknown>;
  id: string;
  label: string;
  requiresScope?: boolean;
  requiresSelection?: boolean;
}

export interface WebserverResourceDataSource {
  actions: readonly WebserverResourceAction[];
  load(query: WebserverResourceQuery): Promise<WebserverResourcePage>;
  requiresScope?: boolean;
}

export type WebserverResourceRegistry = Partial<Record<WebserverResourceKey, WebserverResourceDataSource>>;


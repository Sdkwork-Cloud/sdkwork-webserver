export type WebserverPcSurface = "app-console" | "backend-admin";

export type WebserverActionErrorCode =
  | "application-draft-source-failed"
  | "application-draft-deployment-failed"
  | "deployment-source-stored";

export class WebserverActionError extends Error {
  constructor(
    readonly code: WebserverActionErrorCode,
    readonly details: Readonly<Record<string, string | number>> = {},
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "WebserverActionError";
  }
}

export type WebserverResourceKey =
  | "sites"
  | "configuration"
  | "domains"
  | "certificates"
  | "deployments"
  | "applications"
  | "application-domains"
  | "application-deployments"
  | "managed-certificates"
  | "certificate-distribution"
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
  filters?: Readonly<Record<string, string>>;
  page: number;
  pageSize: number;
  scopeId?: string;
  search?: string;
}

export interface WebserverResourceFilter {
  fieldOptions?: readonly WebserverResourceFieldOptionValue[];
  id: string;
  type: "date" | "select" | "text";
}

export interface WebserverResourceActionContext {
  body: Record<string, unknown>;
  file?: File;
  files?: readonly File[];
  idempotencyKey?: string;
  onProgress?(progress: number): void;
  selectedItem?: Record<string, unknown>;
  signal?: AbortSignal;
  sourceInputMode?: "archive" | "directory";
  scopeId?: string;
}

export interface WebserverResourceFieldOption {
  label: string;
  value: number | string;
}

export type WebserverResourceFieldOptionValue =
  | number
  | string
  | WebserverResourceFieldOption;

export type WebserverResourceFieldOptions = Readonly<
  Record<string, readonly WebserverResourceFieldOptionValue[]>
>;

export interface WebserverResourceAction {
  acceptedFileTypes?: string;
  availableWhen?(context: WebserverResourceActionContext): boolean;
  bodyTemplate: Record<string, unknown>;
  dangerous?: boolean;
  execute(context: WebserverResourceActionContext): Promise<unknown>;
  fieldOptions?: WebserverResourceFieldOptions;
  id: string;
  label: string;
  loadFieldOptions?(context: WebserverResourceActionContext): Promise<WebserverResourceFieldOptions>;
  permission?: string;
  requiredFields?: readonly string[];
  resultFields?: readonly string[];
  requiresConfirmation?: boolean;
  requiresFile?: boolean;
  requiresScope?: boolean;
  requiresSelection?: boolean;
  sourceInput?: "archive-or-directory";
}

export interface WebserverResourceDataSource {
  actions: readonly WebserverResourceAction[];
  filters?: readonly WebserverResourceFilter[];
  load(query: WebserverResourceQuery): Promise<WebserverResourcePage>;
  requiresScope?: boolean;
  scopeKind?: "application" | "site";
}

export type WebserverResourceRegistry = Partial<Record<WebserverResourceKey, WebserverResourceDataSource>>;

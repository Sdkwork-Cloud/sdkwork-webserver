import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import {
  normalizeWebserverPage,
  WebserverActionError,
  type ApplicationSourceStorage,
  type PreparedApplicationSource,
  type StoredApplicationSource,
  type WebserverResourceAction,
  type WebserverResourceActionContext,
  type WebserverResourceDataSource,
  type WebserverResourceRegistry,
} from "@sdkwork/webserver-pc-commons";

type DeploymentCreateRequest = Parameters<
  WebserverAdminSdkClient["applicationDeployment"]["applications"]["deployments"]["create"]
>[1];
type ApplicationUpdateRequest = Parameters<WebserverAdminSdkClient["application"]["update"]>[1];
type ApplicationDomainCreateRequest = Parameters<
  WebserverAdminSdkClient["applicationDomain"]["applications"]["domains"]["create"]
>[1];
type DeploymentMetadata = Omit<
  DeploymentCreateRequest,
  "artifactDriveUri" | "artifactSize" | "artifactHash"
>;

export function createWebserverAdminApplicationRegistry(
  client: WebserverAdminSdkClient,
  sourceStorage: ApplicationSourceStorage,
): WebserverResourceRegistry {
  return {
    applications: source(
      (query) => client.application.list({ page: query.page, pageSize: query.pageSize, keyword: query.search }),
      [
        action(
          "create",
          "Create application",
          {
            name: "",
            description: "",
            applicationType: "WEB",
            siteType: 1,
            environment: "production",
            versionTag: "v1.0.0",
          },
          (context) => createApplicationWithInitialVersion(client, sourceStorage, context),
          {
            fieldOptions: {
              applicationType: ["WEB", "API"],
              siteType: [1, 2, 3, 4, 5, 6],
              environment: ["production", "staging", "test", "development"],
            },
            permission: "web.sites.write",
            requiredFields: ["name", "versionTag"],
            sourceInput: "archive-or-directory",
          },
        ),
        action(
          "update",
          "Update application",
          { name: "", description: "" },
          async (context) => client.application.update(
            selectedId(context),
            updateApplicationRequest(context.body),
            idempotencyParams(context),
          ),
          { requiresSelection: true, permission: "web.sites.write" },
        ),
        action(
          "activate",
          "Activate application",
          {},
          (context) => client.application.activate(selectedId(context), idempotencyParams(context)),
          {
            availableWhen: ({ selectedItem }) => Number(selectedItem?.status) !== 1,
            requiresSelection: true,
            permission: "web.sites.write",
          },
        ),
        action(
          "pause",
          "Disable application",
          {},
          (context) => client.application.pause(selectedId(context), idempotencyParams(context)),
          {
            availableWhen: ({ selectedItem }) => Number(selectedItem?.status) === 1,
            dangerous: true,
            requiresSelection: true,
            permission: "web.sites.write",
          },
        ),
        action(
          "delete",
          "Delete application",
          {},
          (context) => client.application.delete(selectedId(context), idempotencyParams(context)),
          {
            availableWhen: ({ selectedItem }) => Number(selectedItem?.status) !== 1,
            dangerous: true,
            requiresSelection: true,
            permission: "web.sites.write",
          },
        ),
      ],
    ),
    "application-domains": applicationSource(
      (query) => client.applicationDomain.applications.domains.list(requiredApplicationId(query.scopeId), { page: query.page, pageSize: query.pageSize }),
      [
        action(
          "create",
          "Bind domain",
          { hostname: "", isPrimary: false, sslEnabled: true, sslProvider: "letsencrypt" },
          async (context) => client.applicationDomain.applications.domains.create(
            requiredApplicationId(context.scopeId),
            createApplicationDomainRequest(context.body),
            idempotencyParams(context),
          ),
          { requiresScope: true, fieldOptions: { sslProvider: ["letsencrypt", "custom", "none"] }, permission: "web.sites.write" },
        ),
        action(
          "verify",
          "Verify domain",
          {},
          (context) => client.applicationDomain.applications.domains.verify(requiredApplicationId(context.scopeId), selectedId(context), idempotencyParams(context)),
          {
            availableWhen: ({ selectedItem }) => selectedItem?.isVerified !== true,
            requiresScope: true,
            requiresSelection: true,
            permission: "web.sites.write",
          },
        ),
        action(
          "delete",
          "Unbind domain",
          {},
          (context) => client.applicationDomain.applications.domains.delete(
            requiredApplicationId(context.scopeId),
            selectedId(context),
            idempotencyParams(context),
          ),
          {
            dangerous: true,
            requiresScope: true,
            requiresSelection: true,
            permission: "web.sites.write",
          },
        ),
      ],
    ),
    "application-deployments": applicationSource(
      (query) => client.applicationDeployment.applications.deployments.list(requiredApplicationId(query.scopeId), { page: query.page, pageSize: query.pageSize }),
      [
        action(
          "deploy",
          "Create deployment command",
          {
            deployType: 1,
            environment: "production",
            versionTag: "",
            sourceRef: "",
            commitHash: "",
          },
          (context) => deployApplication(client, sourceStorage, context),
          {
            requiresConfirmation: true,
            requiresScope: true,
            fieldOptions: {
              deployType: [1],
              environment: ["production", "staging", "test", "development"],
            },
            permission: "web.sites.write",
            requiredFields: ["versionTag"],
            sourceInput: "archive-or-directory",
          },
        ),
        action(
          "rollback",
          "Restore this version",
          {},
          (context) => client.applicationDeployment.applications.deployments.rollback(
            requiredApplicationId(context.scopeId),
            selectedId(context),
            idempotencyParams(context),
          ),
          {
            availableWhen: ({ selectedItem }) => Number(selectedItem?.status) === 2,
            requiresConfirmation: true,
            requiresScope: true,
            requiresSelection: true,
            permission: "web.sites.write",
          },
        ),
      ],
    ),
  };
}

function source(
  load: WebserverResourceDataSource["load"] extends (query: infer Query) => Promise<unknown> ? (query: Query) => Promise<unknown> : never,
  actions: readonly WebserverResourceAction[],
): WebserverResourceDataSource {
  return { actions, async load(query) { return normalizeWebserverPage(await load(query)); } };
}

function applicationSource(load: Parameters<typeof source>[0], actions: readonly WebserverResourceAction[]): WebserverResourceDataSource {
  return { ...source(load, actions), requiresScope: true, scopeKind: "application" };
}

function action(
  id: string,
  label: string,
  bodyTemplate: Record<string, unknown>,
  execute: WebserverResourceAction["execute"],
  options: Omit<WebserverResourceAction, "bodyTemplate" | "execute" | "id" | "label"> = {},
): WebserverResourceAction {
  return { id, label, bodyTemplate, execute, ...options };
}

function requiredApplicationId(value: string | undefined): string {
  if (!value?.trim()) throw new Error("Application ID is required");
  return value.trim();
}

function selectedId(context: WebserverResourceActionContext): string {
  const value = context.selectedItem?.id;
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Selected resource ID is unavailable");
  return String(value);
}

function idempotencyParams(context: WebserverResourceActionContext): { idempotencyKey: string } {
  const idempotencyKey = context.idempotencyKey?.trim();
  if (!idempotencyKey) throw new Error("Idempotency key is required");
  return { idempotencyKey };
}

async function createApplicationWithInitialVersion(
  client: WebserverAdminSdkClient,
  sourceStorage: ApplicationSourceStorage,
  context: WebserverResourceActionContext,
): Promise<unknown> {
  const applicationRequest = {
    name: requiredText(context.body.name, "Application name"),
    description: optionalText(context.body.description),
    applicationType: applicationType(context.body.applicationType),
    siteType: siteType(context.body.siteType),
  };
  const metadata = deploymentMetadata(context);
  const idempotency = idempotencyParams(context);
  const prepared = await prepareSource(sourceStorage, context, 0, 22);
  const application = await client.application.create(applicationRequest, idempotency);
  const applicationId = application.id?.trim();
  if (!applicationId) throw new Error("The created application did not return an ID");
  context.onProgress?.(26);
  let stored: StoredApplicationSource;
  try {
    stored = await storeSource(sourceStorage, applicationId, prepared, context, 26, 92);
  } catch (error) {
    throw new WebserverActionError(
      "application-draft-source-failed",
      { applicationId },
      { cause: error },
    );
  }
  try {
    const deployment = await client.applicationDeployment.applications.deployments.create(
      applicationId,
      deploymentRequest(metadata, stored),
      idempotency,
    );
    context.onProgress?.(100);
    return { ...deployment, applicationId };
  } catch (error) {
    throw new WebserverActionError(
      "application-draft-deployment-failed",
      { applicationId },
      { cause: error },
    );
  }
}

async function deployApplication(
  client: WebserverAdminSdkClient,
  sourceStorage: ApplicationSourceStorage,
  context: WebserverResourceActionContext,
): Promise<unknown> {
  const applicationId = requiredApplicationId(context.scopeId);
  const metadata = deploymentMetadata(context);
  const idempotency = idempotencyParams(context);
  const prepared = await prepareSource(sourceStorage, context, 0, 24);
  const stored = await storeSource(sourceStorage, applicationId, prepared, context, 24, 94);
  let deployment: unknown;
  try {
    deployment = await client.applicationDeployment.applications.deployments.create(
      applicationId,
      deploymentRequest(metadata, stored),
      idempotency,
    );
  } catch (error) {
    throw new WebserverActionError("deployment-source-stored", {}, { cause: error });
  }
  context.onProgress?.(100);
  return deployment;
}

async function prepareSource(
  sourceStorage: ApplicationSourceStorage,
  context: WebserverResourceActionContext,
  start: number,
  end: number,
): Promise<PreparedApplicationSource> {
  return sourceStorage.prepare({
    files: sourceFiles(context),
    mode: context.sourceInputMode ?? "archive",
    onProgress: (progress) => context.onProgress?.(scaleProgress(progress, start, end)),
    signal: context.signal,
  });
}

async function storeSource(
  sourceStorage: ApplicationSourceStorage,
  applicationId: string,
  prepared: PreparedApplicationSource,
  context: WebserverResourceActionContext,
  start: number,
  end: number,
): Promise<StoredApplicationSource> {
  return sourceStorage.store({
    applicationId,
    package: prepared,
    onProgress: (progress) => context.onProgress?.(scaleProgress(progress, start, end)),
    signal: context.signal,
  });
}

function deploymentRequest(
  metadata: DeploymentMetadata,
  stored: StoredApplicationSource,
): DeploymentCreateRequest {
  return {
    ...metadata,
    artifactDriveUri: stored.archiveDriveUri,
    artifactSize: stored.archiveSize,
    artifactHash: stored.archiveHash,
  };
}

function deploymentMetadata(context: WebserverResourceActionContext): DeploymentMetadata {
  return {
    deployType: deploymentType(context.body.deployType),
    environment: deploymentEnvironment(context.body.environment),
    versionTag: requiredText(context.body.versionTag, "Version"),
    sourceRef: optionalText(context.body.sourceRef),
    commitHash: optionalText(context.body.commitHash),
  };
}

function deploymentType(value: unknown): 1 | 2 | 3 | 4 {
  const normalized = Number(value ?? 1);
  if (normalized === 1 || normalized === 2 || normalized === 3 || normalized === 4) {
    return normalized;
  }
  throw new Error("Deployment method is invalid");
}

function deploymentEnvironment(
  value: unknown,
): "development" | "test" | "staging" | "production" | undefined {
  const normalized = optionalText(value);
  if (normalized === undefined) return undefined;
  if (
    normalized === "development"
    || normalized === "test"
    || normalized === "staging"
    || normalized === "production"
  ) {
    return normalized;
  }
  throw new Error("Deployment environment is invalid");
}

function sourceFiles(context: WebserverResourceActionContext): readonly File[] {
  if (context.files?.length) return context.files;
  if (context.file) return [context.file];
  throw new Error("Application source is required");
}

function scaleProgress(progress: number, start: number, end: number): number {
  return start + Math.round((Math.max(0, Math.min(100, progress)) / 100) * (end - start));
}

function applicationType(value: unknown): "WEB" | "API" {
  if (value === "WEB" || value === "API") return value;
  throw new Error("Application type is invalid");
}

function siteType(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5 || parsed === 6) {
    return parsed;
  }
  throw new Error("Runtime type is invalid");
}

function requiredText(value: unknown, label: string): string {
  const text = optionalText(value);
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function updateApplicationRequest(body: Readonly<Record<string, unknown>>): ApplicationUpdateRequest {
  const name = boundedOptionalText(body.name, "Application name", 100, false);
  const description = boundedOptionalText(body.description, "Description", 500, true);
  if (name === undefined && description === undefined) {
    throw new Error("At least one application field is required");
  }
  return { name, description };
}

function createApplicationDomainRequest(
  body: Readonly<Record<string, unknown>>,
): ApplicationDomainCreateRequest {
  return {
    hostname: hostname(body.hostname),
    isPrimary: optionalBoolean(body.isPrimary, "Primary domain"),
    sslEnabled: optionalBoolean(body.sslEnabled, "TLS"),
    sslProvider: sslProvider(body.sslProvider),
  };
}

function hostname(value: unknown): string {
  const text = boundedRequiredText(value, "Hostname", 253);
  if (text.startsWith(".") || text.endsWith(".") || text.split(".").some((label) => (
    !label
    || label.length > 63
    || label.startsWith("-")
    || label.endsWith("-")
    || !/^[A-Za-z0-9-]+$/.test(label)
  ))) {
    throw new Error("Hostname must be a safe ASCII DNS name");
  }
  return text;
}

function boundedRequiredText(value: unknown, label: string, maximum: number): string {
  const text = boundedOptionalText(value, label, maximum, false);
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function boundedOptionalText(
  value: unknown,
  label: string,
  maximum: number,
  allowEmpty: boolean,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${label} is invalid`);
  const text = value.trim();
  if ((!allowEmpty && !text) || text.length > maximum || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error(`${label} is invalid`);
  }
  return text;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`${label} is invalid`);
  return value;
}

function sslProvider(value: unknown): "letsencrypt" | "custom" | "none" | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "letsencrypt" || value === "custom" || value === "none") return value;
  throw new Error("TLS provider is invalid");
}

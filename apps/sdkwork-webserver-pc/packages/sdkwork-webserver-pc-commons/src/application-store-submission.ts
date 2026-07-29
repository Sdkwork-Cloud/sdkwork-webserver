import {
  validateApplicationPreviewCount,
  type ApplicationMediaResource,
  type ApplicationMediaStorage,
  type ApplicationStoreListingInput,
  type ApplicationSubmissionInput,
} from "./application-media.ts";

export interface ResolveApplicationStoreListingRequest {
  applicationId: string;
  applicationName: string;
  body: Readonly<Record<string, unknown>>;
  current?: ApplicationStoreListingInput;
  mediaStorage: ApplicationMediaStorage;
  onProgress?(progress: number): void;
  signal?: AbortSignal;
  submission: ApplicationSubmissionInput;
}

export async function resolveApplicationStoreListing(
  request: ResolveApplicationStoreListingRequest,
): Promise<ApplicationStoreListingInput> {
  const icon = await resolveIcon(request);
  const cover = await resolveCover(request);
  const previews = await resolvePreviews(request);
  return {
    icon,
    cover,
    previews,
    shortDescription: boundedText(request.body.shortDescription, "Short description", 80),
    fullDescription: boundedText(request.body.fullDescription, "Full description", 4_000),
    releaseNotes: boundedText(request.body.releaseNotes, "Release notes", 4_000),
    category: boundedText(request.body.category, "Category", 80),
    keywords: keywords(request.body.keywords),
    supportUrl: secureUrl(request.body.supportUrl, "Support URL"),
    privacyPolicyUrl: secureUrl(request.body.privacyPolicyUrl, "Privacy policy URL"),
    officialWebsiteUrl: secureUrl(request.body.officialWebsiteUrl, "Official website URL"),
  };
}

export function storeListingBody(current: unknown): Record<string, unknown> {
  const listing = applicationStoreListing(current);
  return {
    shortDescription: listing?.shortDescription ?? "",
    fullDescription: listing?.fullDescription ?? "",
    releaseNotes: listing?.releaseNotes ?? "",
    category: listing?.category ?? "",
    keywords: listing?.keywords?.join(", ") ?? "",
    supportUrl: listing?.supportUrl ?? "",
    privacyPolicyUrl: listing?.privacyPolicyUrl ?? "",
    officialWebsiteUrl: listing?.officialWebsiteUrl ?? "",
  };
}

export function applicationStoreListing(value: unknown): ApplicationStoreListingInput | undefined {
  if (!isRecord(value)) return undefined;
  return value as unknown as ApplicationStoreListingInput;
}

async function resolveIcon(
  request: ResolveApplicationStoreListingRequest,
): Promise<ApplicationMediaResource> {
  if (request.submission.iconMode === "keep") {
    if (request.current?.icon) return request.current.icon;
    throw new Error("An application icon is required");
  }
  const file = request.submission.iconMode === "default"
    ? await request.mediaStorage.createDefaultIcon(request.applicationName)
    : request.submission.iconFile;
  if (!file) throw new Error("Choose an application icon");
  return request.mediaStorage.store({
    altText: `${request.applicationName} icon`,
    applicationId: request.applicationId,
    file,
    onProgress: (progress) => request.onProgress?.(scaleProgress(progress, 0, 24)),
    role: "icon",
    signal: request.signal,
  });
}

async function resolveCover(
  request: ResolveApplicationStoreListingRequest,
): Promise<ApplicationMediaResource | undefined> {
  if (request.submission.coverMode === "keep") return request.current?.cover;
  if (request.submission.coverMode === "remove") return undefined;
  if (!request.submission.coverFile) throw new Error("Choose a cover image");
  return request.mediaStorage.store({
    altText: `${request.applicationName} cover`,
    applicationId: request.applicationId,
    file: request.submission.coverFile,
    onProgress: (progress) => request.onProgress?.(scaleProgress(progress, 24, 48)),
    role: "cover",
    signal: request.signal,
  });
}

async function resolvePreviews(
  request: ResolveApplicationStoreListingRequest,
): Promise<readonly ApplicationMediaResource[]> {
  if (request.submission.previewsMode === "keep") return request.current?.previews ?? [];
  if (request.submission.previewsMode === "remove") return [];
  validateApplicationPreviewCount(request.submission.previewFiles);
  if (request.submission.previewFiles.length === 0) throw new Error("Choose at least one preview image");
  const previews: ApplicationMediaResource[] = [];
  const count = request.submission.previewFiles.length;
  for (const [index, file] of request.submission.previewFiles.entries()) {
    request.signal?.throwIfAborted();
    previews.push(await request.mediaStorage.store({
      altText: `${request.applicationName} preview ${index + 1}`,
      applicationId: request.applicationId,
      file,
      onProgress: (progress) => request.onProgress?.(
        scaleProgress(progress, 48 + (index / count) * 52, 48 + ((index + 1) / count) * 52),
      ),
      role: "preview",
      sequence: index,
      signal: request.signal,
    }));
  }
  return previews;
}

function keywords(value: unknown): readonly string[] | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const values = value.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  if (values.length > 10 || values.some((keyword) => Array.from(keyword).length > 40)) {
    throw new Error("Keywords must contain at most 10 comma-separated values of 40 characters each");
  }
  if (new Set(values.map((keyword) => keyword.toLocaleLowerCase())).size !== values.length) {
    throw new Error("Keywords must not contain duplicates");
  }
  return values;
}

function boundedText(value: unknown, label: string, maximum: number): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const text = value.trim();
  if (Array.from(text).length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    throw new Error(`${label} must not exceed ${maximum} characters`);
  }
  return text;
}

function secureUrl(value: unknown, label: string): string | undefined {
  const text = boundedText(value, label, 2_000);
  if (!text) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash || !parsed.hostname) {
    throw new Error(`${label} must be an HTTPS URL without credentials or fragments`);
  }
  return parsed.toString();
}

function scaleProgress(progress: number, start: number, end: number): number {
  return start + (Math.max(0, Math.min(100, progress)) / 100) * (end - start);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

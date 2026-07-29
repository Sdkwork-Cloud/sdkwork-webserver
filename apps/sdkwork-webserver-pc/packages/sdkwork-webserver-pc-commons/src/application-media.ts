export type ApplicationMediaRole = "icon" | "cover" | "preview";

export interface ApplicationMediaResource {
  id: string;
  kind: "image";
  source: "drive";
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
  checksum?: {
    algorithm: "sha256";
    value: string;
  };
  width: number;
  height: number;
  altText?: string;
  metadata: {
    drive: {
      nodeId: string;
      spaceId: string;
    };
  };
}

export interface ApplicationStoreListingInput {
  icon?: ApplicationMediaResource;
  cover?: ApplicationMediaResource;
  previews?: readonly ApplicationMediaResource[];
  shortDescription?: string;
  fullDescription?: string;
  releaseNotes?: string;
  category?: string;
  keywords?: readonly string[];
  supportUrl?: string;
  privacyPolicyUrl?: string;
  officialWebsiteUrl?: string;
}

export interface StoreApplicationMediaRequest {
  altText?: string;
  applicationId: string;
  file: File;
  onProgress?(progress: number): void;
  role: ApplicationMediaRole;
  sequence?: number;
  signal?: AbortSignal;
}

export interface ApplicationMediaStorage {
  createDefaultIcon(applicationName: string): Promise<File>;
  store(request: StoreApplicationMediaRequest): Promise<ApplicationMediaResource>;
}

export interface ApplicationSubmissionInput {
  coverFile?: File;
  coverMode: "keep" | "remove" | "upload";
  iconFile?: File;
  iconMode: "keep" | "default" | "upload";
  previewFiles: readonly File[];
  previewsMode: "keep" | "remove" | "replace";
}

export interface ApplicationImageDimensions {
  height: number;
  width: number;
}

const ICON_BYTES = 2 * 1024 * 1024;
const STORE_IMAGE_BYTES = 10 * 1024 * 1024;
export const APPLICATION_PREVIEW_LIMIT = 10;
const PREVIEW_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function validateApplicationMediaFile(
  role: ApplicationMediaRole,
  file: File,
): Promise<ApplicationImageDimensions> {
  const maximumBytes = role === "icon" ? ICON_BYTES : STORE_IMAGE_BYTES;
  if (file.size < 1 || file.size > maximumBytes) {
    throw new Error(role === "icon" ? "ICON_SIZE" : "STORE_IMAGE_SIZE");
  }
  if (role === "icon" ? file.type !== "image/png" : !PREVIEW_MIME_TYPES.has(file.type)) {
    throw new Error(role === "icon" ? "ICON_TYPE" : "STORE_IMAGE_TYPE");
  }
  const dimensions = await readApplicationImageDimensions(file);
  if (role === "icon" && (dimensions.width !== 1024 || dimensions.height !== 1024)) {
    throw new Error("ICON_DIMENSIONS");
  }
  if (role === "cover" && (dimensions.width !== 1024 || dimensions.height !== 500)) {
    throw new Error("COVER_DIMENSIONS");
  }
  if (role === "preview") {
    const minimum = Math.min(dimensions.width, dimensions.height);
    const maximum = Math.max(dimensions.width, dimensions.height);
    if (
      dimensions.width < 320
      || dimensions.width > 3840
      || dimensions.height < 320
      || dimensions.height > 3840
      || maximum / minimum > 2.5
    ) {
      throw new Error("PREVIEW_DIMENSIONS");
    }
  }
  return dimensions;
}

export function validateApplicationPreviewCount(files: readonly File[]): void {
  if (files.length > APPLICATION_PREVIEW_LIMIT) throw new Error("PREVIEW_COUNT");
}

export async function readApplicationImageDimensions(file: File): Promise<ApplicationImageDimensions> {
  if (typeof globalThis.createImageBitmap === "function") {
    const bitmap = await globalThis.createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }
  if (typeof Image !== "function" || !globalThis.URL?.createObjectURL) {
    throw new Error("IMAGE_INSPECTION_UNAVAILABLE");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<ApplicationImageDimensions>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("IMAGE_DECODE"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createDefaultApplicationIcon(applicationName: string): Promise<File> {
  if (typeof document === "undefined") throw new Error("ICON_GENERATION_UNAVAILABLE");
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("ICON_GENERATION_UNAVAILABLE");

  const seed = stableNameHash(applicationName);
  const hue = seed % 360;
  context.fillStyle = `hsl(${hue} 58% 38%)`;
  context.fillRect(0, 0, 1024, 1024);
  context.fillStyle = `hsl(${(hue + 34) % 360} 62% 48%)`;
  context.beginPath();
  context.arc(820, 204, 310, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 255, 255, 0.96)";
  context.font = "700 440px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(applicationInitial(applicationName), 512, 535, 720);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("ICON_GENERATION_FAILED")), "image/png");
  });
  return new File([blob], "application-icon.png", { type: "image/png", lastModified: 0 });
}

function applicationInitial(value: string): string {
  const initial = Array.from(value.trim())[0];
  return initial?.toLocaleUpperCase() || "A";
}

function stableNameHash(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value.trim().toLocaleLowerCase()) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

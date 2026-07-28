import { zip } from "fflate";

export const APPLICATION_SOURCE_MAX_FILES = 10_000;
export const APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;

export type ApplicationSourceInputMode = "archive" | "directory";

export interface PrepareApplicationSourceRequest {
  files: readonly File[];
  mode: ApplicationSourceInputMode;
  onProgress?(progress: number): void;
}

export interface PreparedApplicationSource {
  archive: File;
  archiveHash: string;
  sourceFileCount: number;
  uncompressedSize: number;
}

export interface StoreApplicationSourceRequest {
  applicationId: string;
  package: PreparedApplicationSource;
  onProgress?(progress: number): void;
}

export interface StoredApplicationSource {
  archiveDriveUri: string;
  archiveHash: string;
  archiveSize: string;
  extractedCount: string;
}

export interface ApplicationSourceStorage {
  prepare(request: PrepareApplicationSourceRequest): Promise<PreparedApplicationSource>;
  store(request: StoreApplicationSourceRequest): Promise<StoredApplicationSource>;
}

export async function prepareApplicationSourcePackage(
  request: PrepareApplicationSourceRequest,
): Promise<PreparedApplicationSource> {
  request.onProgress?.(0);
  if (request.mode === "archive") {
    const archive = validateArchiveSelection(request.files);
    request.onProgress?.(35);
    const archiveHash = await sha256Hex(archive);
    request.onProgress?.(100);
    return {
      archive,
      archiveHash,
      sourceFileCount: 1,
      uncompressedSize: archive.size,
    };
  }

  const entries = validateDirectorySelection(request.files);
  const zipEntries: Record<string, Uint8Array> = {};
  for (const [index, entry] of entries.entries()) {
    zipEntries[entry.path] = new Uint8Array(await entry.file.arrayBuffer());
    request.onProgress?.(Math.round(((index + 1) / entries.length) * 55));
  }

  const zipped = await zipDirectory(zipEntries);
  request.onProgress?.(85);
  const archive = new File(
    [zipped],
    `${sourceDirectoryName(entries[0].path)}-source.zip`,
    { type: "application/zip" },
  );
  const archiveHash = await sha256Hex(archive);
  request.onProgress?.(100);
  return {
    archive,
    archiveHash,
    sourceFileCount: entries.length,
    uncompressedSize: entries.reduce((total, entry) => total + entry.file.size, 0),
  };
}

export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function validateArchiveSelection(files: readonly File[]): File {
  if (files.length !== 1) {
    throw new Error("Select exactly one ZIP source package");
  }
  const [archive] = files;
  if (archive.size <= 0) {
    throw new Error("The ZIP source package is empty");
  }
  if (!archive.name.toLowerCase().endsWith(".zip")) {
    throw new Error("The source package must be a ZIP archive");
  }
  if (archive.size > APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES) {
    throw new Error("The ZIP source package exceeds the 256 MiB browser upload limit");
  }
  return archive;
}

function validateDirectorySelection(files: readonly File[]): Array<{ file: File; path: string }> {
  if (files.length === 0) {
    throw new Error("Select a non-empty source directory");
  }
  if (files.length > APPLICATION_SOURCE_MAX_FILES) {
    throw new Error(`A source directory cannot contain more than ${APPLICATION_SOURCE_MAX_FILES} files`);
  }

  const seenPaths = new Set<string>();
  let totalBytes = 0;
  return files.map((file) => {
    const path = normalizeRelativePath(file.webkitRelativePath || file.name);
    const collisionKey = path.toLowerCase();
    if (seenPaths.has(collisionKey)) {
      throw new Error(`The source directory contains a duplicate path: ${path}`);
    }
    seenPaths.add(collisionKey);
    totalBytes += file.size;
    if (totalBytes > APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES) {
      throw new Error("The source directory exceeds the 256 MiB browser packaging limit");
    }
    return { file, path };
  });
}

function normalizeRelativePath(input: string): string {
  const normalized = input.replaceAll("\\", "/");
  if (
    !normalized
    || normalized.includes("\0")
    || normalized.startsWith("/")
    || /^[A-Za-z]:\//.test(normalized)
  ) {
    throw new Error("The source directory contains an invalid file path");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`The source directory contains an unsafe file path: ${input}`);
  }
  return segments.join("/");
}

function sourceDirectoryName(firstPath: string): string {
  const name = firstPath.split("/")[0]
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || "application";
}

function zipDirectory(entries: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(entries, { level: 6 }, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
}

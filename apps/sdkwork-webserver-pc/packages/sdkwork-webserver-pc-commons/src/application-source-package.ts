import { zip } from "fflate";
import ignore from "ignore";

export const APPLICATION_SOURCE_MAX_SELECTED_FILES = 100_000;
export const APPLICATION_SOURCE_MAX_FILES = 500;
export const APPLICATION_SOURCE_MAX_FILE_BYTES = 16 * 1024 * 1024;
export const APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
export const APPLICATION_SOURCE_MAX_PATH_DEPTH = 64;
export const APPLICATION_SOURCE_MAX_PATH_BYTES = 4_096;
export const APPLICATION_SOURCE_MAX_PATH_SEGMENT_BYTES = 255;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const VCS_METADATA_DIRECTORIES = new Set([".git", ".hg", ".svn"]);
const UTF8_ENCODER = new TextEncoder();

export type ApplicationSourceInputMode = "archive" | "directory";

export interface PrepareApplicationSourceRequest {
  files: readonly File[];
  mode: ApplicationSourceInputMode;
  onProgress?(progress: number): void;
  signal?: AbortSignal;
}

export interface PreparedApplicationSource {
  archive: File;
  archiveHash: string;
  inputMode: ApplicationSourceInputMode;
  sourceFileCount: number;
  uncompressedSize: number;
}

export interface StoreApplicationSourceRequest {
  applicationId: string;
  package: PreparedApplicationSource;
  onProgress?(progress: number): void;
  signal?: AbortSignal;
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

export interface ApplicationArchiveEntry {
  isDirectory: boolean;
  path: string;
  uncompressedSizeBytes: string;
}

export interface ValidatedApplicationArchive {
  entryPaths: readonly string[];
  sourceFileCount: number;
  uncompressedSize: number;
}

export async function prepareApplicationSourcePackage(
  request: PrepareApplicationSourceRequest,
): Promise<PreparedApplicationSource> {
  throwIfAborted(request.signal);
  request.onProgress?.(0);
  if (request.mode === "archive") {
    const archive = validateArchiveSelection(request.files);
    request.onProgress?.(35);
    const archiveHash = await sha256Hex(archive);
    throwIfAborted(request.signal);
    request.onProgress?.(100);
    return {
      archive,
      archiveHash,
      inputMode: "archive",
      sourceFileCount: 1,
      uncompressedSize: archive.size,
    };
  }

  const selectedEntries = validateDirectorySelection(request.files);
  const sourceEntries = selectedEntries.filter((entry) => !isVcsMetadataPath(entry.relativePath));
  const entries = await filterIgnoredDirectoryEntries(sourceEntries, request.signal);
  validateDirectoryPackageLimits(entries);
  const zipEntries: Record<string, Uint8Array> = {};
  for (const [index, entry] of entries.entries()) {
    throwIfAborted(request.signal);
    zipEntries[entry.path] = new Uint8Array(await entry.file.arrayBuffer());
    request.onProgress?.(Math.round(((index + 1) / entries.length) * 55));
  }

  const zipped = await zipDirectory(zipEntries, request.signal);
  request.onProgress?.(85);
  const archiveBuffer = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(archiveBuffer).set(zipped);
  const archive = new File(
    [archiveBuffer],
    `${sourceDirectoryName(entries[0].path)}-source.zip`,
    { type: "application/zip" },
  );
  const archiveHash = await sha256Hex(archive);
  throwIfAborted(request.signal);
  request.onProgress?.(100);
  return {
    archive,
    archiveHash,
    inputMode: "directory",
    sourceFileCount: entries.length,
    uncompressedSize: entries.reduce((total, entry) => total + entry.file.size, 0),
  };
}

export function validateApplicationArchiveEntries(
  entries: readonly ApplicationArchiveEntry[],
  options: { excludeDriveSanitizedVcs?: boolean; hasMore?: boolean } = {},
): ValidatedApplicationArchive {
  if (options.hasMore) {
    throw new Error("The source archive listing is incomplete and cannot be extracted safely");
  }
  if (entries.length === 0) {
    throw new Error("The source archive does not contain any entries");
  }
  if (entries.length > APPLICATION_SOURCE_MAX_FILES) {
    throw new Error(`The source archive cannot contain more than ${APPLICATION_SOURCE_MAX_FILES} entries`);
  }

  const seenPaths = new Set<string>();
  const filePaths = new Set<string>();
  const entryPaths: string[] = [];
  let totalBytes = 0;
  for (const entry of entries) {
    const path = normalizeArchiveEntryPath(entry.path, entry.isDirectory);
    if (isVcsMetadataPath(path, options.excludeDriveSanitizedVcs)) continue;
    const collisionKey = portablePathKey(path);
    if (seenPaths.has(collisionKey)) {
      throw new Error(`The source archive contains a duplicate path: ${path}`);
    }
    seenPaths.add(collisionKey);
    if (entry.isDirectory) continue;

    const size = archiveEntrySize(entry.uncompressedSizeBytes, path);
    if (size > APPLICATION_SOURCE_MAX_FILE_BYTES) {
      throw new Error(`The source archive file exceeds the 16 MiB limit: ${path}`);
    }
    totalBytes += size;
    if (totalBytes > APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES) {
      throw new Error("The source archive exceeds the 64 MiB extraction limit");
    }
    filePaths.add(collisionKey);
    entryPaths.push(path);
  }

  for (const path of entryPaths) {
    let parent = dirname(path);
    while (parent) {
      if (filePaths.has(portablePathKey(parent))) {
        throw new Error(`The source archive contains a file and child path conflict: ${path}`);
      }
      parent = dirname(parent);
    }
  }
  if (entryPaths.length === 0) {
    throw new Error("The source archive does not contain extractable application files");
  }
  return {
    entryPaths,
    sourceFileCount: entryPaths.length,
    uncompressedSize: totalBytes,
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
    throw new Error("The ZIP source package exceeds the 64 MiB browser upload limit");
  }
  return archive;
}

interface DirectoryEntry {
  file: File;
  path: string;
  relativePath: string;
}

interface IgnoreScope {
  directory: string;
  matcher: ReturnType<typeof ignore>;
}

function validateDirectorySelection(files: readonly File[]): DirectoryEntry[] {
  if (files.length === 0) {
    throw new Error("Select a non-empty source directory");
  }
  if (files.length > APPLICATION_SOURCE_MAX_SELECTED_FILES) {
    throw new Error(
      `A source directory cannot contain more than ${APPLICATION_SOURCE_MAX_SELECTED_FILES} selected files`,
    );
  }

  const seenPaths = new Set<string>();
  const entries = files.map((file) => {
    const path = normalizeRelativePath(file.webkitRelativePath || file.name);
    const collisionKey = portablePathKey(path);
    if (seenPaths.has(collisionKey)) {
      throw new Error(`The source directory contains a duplicate path: ${path}`);
    }
    seenPaths.add(collisionKey);
    return { file, path, relativePath: path };
  });

  const browserPaths = entries.filter((entry) => Boolean(entry.file.webkitRelativePath));
  if (browserPaths.length === 0) return entries;
  const roots = new Set(browserPaths.map((entry) => entry.path.split("/")[0]));
  if (browserPaths.length !== entries.length || roots.size !== 1) {
    throw new Error("Select files from exactly one source directory");
  }
  const [root] = roots;
  return entries.map((entry) => ({
    ...entry,
    relativePath: entry.path.slice(root.length + 1),
  }));
}

async function filterIgnoredDirectoryEntries(
  entries: readonly DirectoryEntry[],
  signal?: AbortSignal,
): Promise<DirectoryEntry[]> {
  if (entries.length === 0) {
    throw new Error("No application source files remain after excluding version-control metadata");
  }
  const ignoreFiles = entries
    .filter((entry) => basename(entry.relativePath) === ".gitignore")
    .sort((left, right) => pathDepth(left.relativePath) - pathDepth(right.relativePath)
      || left.relativePath.localeCompare(right.relativePath));
  const scopes: IgnoreScope[] = [];
  const scopeDirectoryCache = new Map<string, boolean>();

  for (const entry of ignoreFiles) {
    throwIfAborted(signal);
    const directory = dirname(entry.relativePath);
    if (directory && isDirectoryIgnored(directory, scopes, scopeDirectoryCache)) continue;
    const rules = new TextDecoder().decode(await entry.file.arrayBuffer());
    scopes.push({ directory, matcher: ignore().add(rules) });
    scopeDirectoryCache.clear();
  }

  const directoryCache = new Map<string, boolean>();
  const filtered = entries.filter((entry) => !isPathIgnored(entry.relativePath, scopes, directoryCache));
  if (filtered.length === 0) {
    throw new Error("No source files remain after applying .gitignore rules");
  }
  return filtered;
}

function isPathIgnored(
  path: string,
  scopes: readonly IgnoreScope[],
  directoryCache: Map<string, boolean>,
): boolean {
  const parent = dirname(path);
  if (parent && isDirectoryIgnored(parent, scopes, directoryCache)) return true;
  return evaluateIgnoreRules(path, false, scopes);
}

function isDirectoryIgnored(
  path: string,
  scopes: readonly IgnoreScope[],
  cache: Map<string, boolean>,
): boolean {
  const cached = cache.get(path);
  if (cached !== undefined) return cached;
  const parent = dirname(path);
  const ignored = (parent && isDirectoryIgnored(parent, scopes, cache))
    || evaluateIgnoreRules(path, true, scopes);
  cache.set(path, Boolean(ignored));
  return Boolean(ignored);
}

function evaluateIgnoreRules(
  path: string,
  directory: boolean,
  scopes: readonly IgnoreScope[],
): boolean {
  let ignored = false;
  for (const scope of scopes) {
    const scopedPath = relativeToScope(path, scope.directory);
    if (scopedPath === undefined || scopedPath === "") continue;
    const result = scope.matcher.test(directory ? `${scopedPath}/` : scopedPath);
    if (result.ignored) ignored = true;
    if (result.unignored) ignored = false;
  }
  return ignored;
}

function relativeToScope(path: string, scope: string): string | undefined {
  if (!scope) return path;
  if (path === scope) return "";
  return path.startsWith(`${scope}/`) ? path.slice(scope.length + 1) : undefined;
}

function dirname(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator < 0 ? "" : path.slice(0, separator);
}

function basename(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator < 0 ? path : path.slice(separator + 1);
}

function pathDepth(path: string): number {
  return path ? path.split("/").length : 0;
}

function validateDirectoryPackageLimits(entries: readonly DirectoryEntry[]): void {
  if (entries.length > APPLICATION_SOURCE_MAX_FILES) {
    throw new Error(
      `A source directory cannot contain more than ${APPLICATION_SOURCE_MAX_FILES} files after applying .gitignore rules`,
    );
  }
  const oversizedFile = entries.find((entry) => entry.file.size > APPLICATION_SOURCE_MAX_FILE_BYTES);
  if (oversizedFile) {
    throw new Error(`The source directory file exceeds the 16 MiB limit: ${oversizedFile.relativePath}`);
  }
  const totalBytes = entries.reduce((total, entry) => total + entry.file.size, 0);
  if (totalBytes > APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES) {
    throw new Error("The source directory exceeds the 64 MiB browser packaging limit after applying .gitignore rules");
  }
}

function normalizeRelativePath(input: string): string {
  const normalized = input.replaceAll("\\", "/");
  if (
    !normalized
    || CONTROL_CHARACTER_PATTERN.test(normalized)
    || normalized.startsWith("/")
    || /^[A-Za-z]:\//.test(normalized)
  ) {
    throw new Error("The source directory contains an invalid file path");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`The source directory contains an unsafe file path: ${input}`);
  }
  validatePathCapacity(segments, input);
  return segments.join("/");
}

function normalizeArchiveEntryPath(input: string, directory: boolean): string {
  const path = directory ? input.replace(/[\\/]+$/, "") : input;
  return normalizeRelativePath(path);
}

function validatePathCapacity(segments: readonly string[], input: string): void {
  if (segments.length > APPLICATION_SOURCE_MAX_PATH_DEPTH) {
    throw new Error(`The application source path exceeds ${APPLICATION_SOURCE_MAX_PATH_DEPTH} levels: ${input}`);
  }
  if (UTF8_ENCODER.encode(segments.join("/")).byteLength > APPLICATION_SOURCE_MAX_PATH_BYTES) {
    throw new Error(`The application source path exceeds ${APPLICATION_SOURCE_MAX_PATH_BYTES} UTF-8 bytes: ${input}`);
  }
  const oversizedSegment = segments.find(
    (segment) => UTF8_ENCODER.encode(segment).byteLength > APPLICATION_SOURCE_MAX_PATH_SEGMENT_BYTES,
  );
  if (oversizedSegment) {
    throw new Error(
      `The application source path segment exceeds ${APPLICATION_SOURCE_MAX_PATH_SEGMENT_BYTES} UTF-8 bytes: ${oversizedSegment}`,
    );
  }
}

function portablePathKey(path: string): string {
  return path.normalize("NFC").toLocaleLowerCase("en-US");
}

function isVcsMetadataPath(path: string, includeDriveSanitizedNames = false): boolean {
  return path.split("/").some((segment) => {
    const normalized = segment.toLocaleLowerCase("en-US");
    return VCS_METADATA_DIRECTORIES.has(normalized)
      || (includeDriveSanitizedNames && ["git", "hg", "svn"].includes(normalized));
  });
}

function archiveEntrySize(input: string, path: string): number {
  if (!/^(0|[1-9][0-9]*)$/.test(input)) {
    throw new Error(`The source archive contains an invalid file size: ${path}`);
  }
  const size = Number(input);
  if (!Number.isSafeInteger(size)) {
    throw new Error(`The source archive file size exceeds the supported range: ${path}`);
  }
  return size;
}

function sourceDirectoryName(firstPath: string): string {
  const name = firstPath.split("/")[0]
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || "application";
}

function zipDirectory(entries: Record<string, Uint8Array>, signal?: AbortSignal): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let cancel = () => {};
    const abort = () => {
      cancel();
      complete(() => reject(abortError()));
    };
    const complete = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      callback();
    };
    cancel = zip(entries, { level: 6 }, (error, data) => {
      if (error) {
        complete(() => reject(error));
        return;
      }
      complete(() => resolve(data));
    });
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortError();
}

function abortError(): Error {
  const error = new Error("Application source preparation was cancelled");
  error.name = "AbortError";
  return error;
}

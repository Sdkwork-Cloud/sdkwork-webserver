import { AsyncZipDeflate, Zip } from "fflate";
import ignore from "ignore";

export const APPLICATION_SOURCE_MAX_SELECTED_FILES = 100_000;
export const APPLICATION_SOURCE_MAX_SELECTED_PATH_BYTES = 16 * 1024 * 1024;
export const APPLICATION_SOURCE_MAX_FILES = 500;
export const APPLICATION_SOURCE_MAX_FILE_BYTES = 16 * 1024 * 1024;
export const APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
export const APPLICATION_SOURCE_MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
export const APPLICATION_SOURCE_MAX_IGNORE_FILES = 256;
export const APPLICATION_SOURCE_MAX_IGNORE_FILE_BYTES = 1024 * 1024;
export const APPLICATION_SOURCE_MAX_IGNORE_BYTES = 4 * 1024 * 1024;
export const APPLICATION_SOURCE_MAX_PATH_DEPTH = 64;
export const APPLICATION_SOURCE_MAX_PATH_BYTES = 4_096;
export const APPLICATION_SOURCE_MAX_PATH_SEGMENT_BYTES = 255;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const VCS_METADATA_DIRECTORIES = new Set([".git", ".hg", ".svn"]);
const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const ZIP_ENTRY_TIMESTAMP = new Date(1980, 0, 1, 0, 0, 0, 0);
const IGNORE_FILTER_BATCH_SIZE = 4_096;

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
  const entries = (await filterIgnoredDirectoryEntries(sourceEntries, request.signal))
    .sort((left, right) => comparePortablePaths(left.path, right.path));
  validateDirectoryPackageLimits(entries);
  const archive = await zipDirectory(entries, request.onProgress, request.signal);
  request.onProgress?.(85);
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
  if (archive.size > APPLICATION_SOURCE_MAX_ARCHIVE_BYTES) {
    throw new Error("The ZIP source package exceeds the 64 MiB browser upload limit");
  }
  return archive;
}

interface DirectoryEntry {
  file: File;
  path: string;
  relativePath: string;
}

type IgnoreScopeIndex = ReadonlyMap<string, ReturnType<typeof ignore>>;

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
  const entries: DirectoryEntry[] = [];
  let selectedPathBytes = 0;
  for (const file of files) {
    const path = normalizeRelativePath(file.webkitRelativePath || file.name);
    selectedPathBytes += UTF8_ENCODER.encode(path).byteLength;
    if (selectedPathBytes > APPLICATION_SOURCE_MAX_SELECTED_PATH_BYTES) {
      throw new Error(
        `A source directory cannot exceed ${APPLICATION_SOURCE_MAX_SELECTED_PATH_BYTES} UTF-8 path bytes`,
      );
    }
    const collisionKey = portablePathKey(path);
    if (seenPaths.has(collisionKey)) {
      throw new Error(`The source directory contains a duplicate path: ${path}`);
    }
    seenPaths.add(collisionKey);
    entries.push({ file, path, relativePath: path });
  }

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
  const ignoreFilesByDepth = Array.from(
    { length: APPLICATION_SOURCE_MAX_PATH_DEPTH + 1 },
    () => [] as DirectoryEntry[],
  );
  for (const entry of entries) {
    if (basename(entry.relativePath) !== ".gitignore") continue;
    ignoreFilesByDepth[pathDepth(entry.relativePath)].push(entry);
  }
  const scopes = new Map<string, ReturnType<typeof ignore>>();
  const scopeDirectoryCache = new Map<string, boolean>();
  let ignoreBytes = 0;

  for (const ignoreFiles of ignoreFilesByDepth) {
    for (const entry of ignoreFiles) {
      throwIfAborted(signal);
      const directory = dirname(entry.relativePath);
      if (directory && isDirectoryIgnored(directory, scopes, scopeDirectoryCache)) continue;
      if (scopes.size >= APPLICATION_SOURCE_MAX_IGNORE_FILES) {
        throw new Error(
          `A source directory cannot contain more than ${APPLICATION_SOURCE_MAX_IGNORE_FILES} active .gitignore files`,
        );
      }
      validateFileSize(entry.file, entry.relativePath);
      if (entry.file.size > APPLICATION_SOURCE_MAX_IGNORE_FILE_BYTES) {
        throw new Error(`The .gitignore file exceeds the 1 MiB rule limit: ${entry.relativePath}`);
      }
      ignoreBytes += entry.file.size;
      if (ignoreBytes > APPLICATION_SOURCE_MAX_IGNORE_BYTES) {
        throw new Error("The source directory exceeds the 4 MiB cumulative .gitignore rule limit");
      }
      const ruleBuffer = await entry.file.arrayBuffer();
      throwIfAborted(signal);
      let rules: string;
      try {
        rules = UTF8_DECODER.decode(ruleBuffer);
      } catch {
        throw new Error(`The .gitignore file is not valid UTF-8: ${entry.relativePath}`);
      }
      try {
        scopes.set(directory, ignore().add(rules));
      } catch {
        throw new Error(`The .gitignore rules could not be parsed: ${entry.relativePath}`);
      }
      scopeDirectoryCache.clear();
    }
  }

  const directoryCache = new Map<string, boolean>();
  const filtered: DirectoryEntry[] = [];
  for (const [index, entry] of entries.entries()) {
    if (index > 0 && index % IGNORE_FILTER_BATCH_SIZE === 0) {
      await yieldToEventLoop();
      throwIfAborted(signal);
    }
    if (isPathIgnored(entry.relativePath, scopes, directoryCache)) continue;
    filtered.push(entry);
    if (filtered.length > APPLICATION_SOURCE_MAX_FILES) {
      throw new Error(
        `A source directory cannot contain more than ${APPLICATION_SOURCE_MAX_FILES} files after applying .gitignore rules`,
      );
    }
  }
  if (filtered.length === 0) {
    throw new Error("No source files remain after applying .gitignore rules");
  }
  return filtered;
}

function isPathIgnored(
  path: string,
  scopes: IgnoreScopeIndex,
  directoryCache: Map<string, boolean>,
): boolean {
  const parent = dirname(path);
  if (parent && isDirectoryIgnored(parent, scopes, directoryCache)) return true;
  return evaluateIgnoreRules(path, false, scopes);
}

function isDirectoryIgnored(
  path: string,
  scopes: IgnoreScopeIndex,
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
  scopes: IgnoreScopeIndex,
): boolean {
  let ignored = false;
  let scopeEnd = 0;
  while (true) {
    const scopeDirectory = scopeEnd === 0 ? "" : path.slice(0, scopeEnd);
    const matcher = scopes.get(scopeDirectory);
    if (matcher) {
      const scopedPath = scopeDirectory ? path.slice(scopeDirectory.length + 1) : path;
      const result = matcher.test(directory ? `${scopedPath}/` : scopedPath);
      if (result.ignored) ignored = true;
      if (result.unignored) ignored = false;
    }

    const separator = path.indexOf("/", scopeEnd === 0 ? 0 : scopeEnd + 1);
    if (separator < 0) break;
    scopeEnd = separator;
  }
  return ignored;
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
  if (!path) return 0;
  let depth = 1;
  for (let separator = path.indexOf("/"); separator >= 0; separator = path.indexOf("/", separator + 1)) {
    depth += 1;
  }
  return depth;
}

function validateDirectoryPackageLimits(entries: readonly DirectoryEntry[]): void {
  if (entries.length > APPLICATION_SOURCE_MAX_FILES) {
    throw new Error(
      `A source directory cannot contain more than ${APPLICATION_SOURCE_MAX_FILES} files after applying .gitignore rules`,
    );
  }
  for (const entry of entries) validateFileSize(entry.file, entry.relativePath);
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

function comparePortablePaths(left: string, right: string): number {
  const leftKey = portablePathKey(left);
  const rightKey = portablePathKey(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
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

function validateFileSize(file: Pick<File, "size">, path: string): void {
  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new Error(`The application source contains an invalid file size: ${path}`);
  }
}

function sourceDirectoryName(firstPath: string): string {
  const name = firstPath.split("/")[0]
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || "application";
}

async function zipDirectory(
  entries: readonly DirectoryEntry[],
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let archiveBytes = 0;
  let archiveError: Error | null = null;
  let completeArchive = () => {};
  const archiveComplete = new Promise<void>((resolve) => {
    completeArchive = resolve;
  });
  const archive = new Zip((error, data, final) => {
    if (error) {
      archiveError = error;
      completeArchive();
      return;
    }
    if (data.byteLength > 0) {
      archiveBytes += data.byteLength;
      chunks.push(data);
    }
    if (final) completeArchive();
  });

  try {
    for (const [index, entry] of entries.entries()) {
      throwIfAborted(signal);
      const source = new Uint8Array(await entry.file.arrayBuffer());
      throwIfAborted(signal);
      await appendZipEntry(archive, entry.path, source, signal);
      onProgress?.(Math.round(((index + 1) / entries.length) * 80));
    }
    archive.end();
    await archiveComplete;
    throwIfAborted(signal);
    if (archiveError) throw archiveError;
    if (archiveBytes > APPLICATION_SOURCE_MAX_ARCHIVE_BYTES) {
      throw new Error("The generated source ZIP exceeds the 64 MiB browser upload limit");
    }
    const output = new File(
      chunks,
      `${sourceDirectoryName(entries[0].path)}-source.zip`,
      { type: "application/zip" },
    );
    chunks.length = 0;
    return output;
  } catch (error) {
    archive.terminate();
    throw error;
  }
}

function appendZipEntry(
  archive: Zip,
  path: string,
  source: Uint8Array,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const entry = new AsyncZipDeflate(path, { level: 6 });
    entry.mtime = ZIP_ENTRY_TIMESTAMP;
    archive.add(entry);
    const forward = entry.ondata;
    let settled = false;
    const complete = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      callback();
    };
    const abort = () => {
      entry.terminate();
      complete(() => reject(abortError()));
    };
    entry.ondata = (error, data, final) => {
      forward(error, data, final);
      if (error) {
        complete(() => reject(error));
        return;
      }
      if (final) complete(resolve);
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    entry.push(source, true);
  });
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortError();
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

function abortError(): Error {
  const error = new Error("Application source preparation was cancelled");
  error.name = "AbortError";
  return error;
}

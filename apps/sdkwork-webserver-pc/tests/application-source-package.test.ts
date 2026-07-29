// @vitest-environment jsdom

import {
  APPLICATION_SOURCE_MAX_FILE_BYTES,
  APPLICATION_SOURCE_MAX_FILES,
  APPLICATION_SOURCE_MAX_IGNORE_FILE_BYTES,
  APPLICATION_SOURCE_MAX_PATH_DEPTH,
  APPLICATION_SOURCE_MAX_SELECTED_FILES,
  APPLICATION_SOURCE_MAX_SELECTED_PATH_BYTES,
  APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES,
  prepareApplicationSourcePackage,
  validateApplicationArchiveEntries,
} from "@sdkwork/webserver-pc-commons";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

describe("application source packaging", () => {
  it("keeps a selected ZIP archive immutable and calculates its SHA-256 identity", async () => {
    const archive = new File(["hello"], "release.zip", { type: "application/zip" });

    const prepared = await prepareApplicationSourcePackage({
      files: [archive],
      mode: "archive",
    });

    expect(prepared.archive).toBe(archive);
    expect(prepared.archiveHash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    expect(prepared.inputMode).toBe("archive");
    expect(prepared.sourceFileCount).toBe(1);
  });

  it("packages a selected directory while preserving browser relative paths", async () => {
    const index = directoryFile("console.log('ready')", "portal/src/index.ts");
    const manifest = directoryFile('{"name":"portal"}', "portal/package.json");

    const prepared = await prepareApplicationSourcePackage({
      files: [index, manifest],
      mode: "directory",
    });
    const archive = unzipSync(new Uint8Array(await prepared.archive.arrayBuffer()));

    expect(Object.keys(archive).sort()).toEqual(["portal/package.json", "portal/src/index.ts"]);
    expect(strFromU8(archive["portal/src/index.ts"])).toBe("console.log('ready')");
    expect(prepared.archive.name).toBe("portal-source.zip");
    expect(prepared.inputMode).toBe("directory");
    expect(prepared.sourceFileCount).toBe(2);
  });

  it("writes deterministic ZIP metadata for content-addressed directory packages", async () => {
    const index = directoryFile("ready", "portal/index.html");
    const manifest = directoryFile('{"name":"portal"}', "portal/package.json");
    const first = await prepareApplicationSourcePackage({
      files: [index, manifest],
      mode: "directory",
    });
    const second = await prepareApplicationSourcePackage({
      files: [manifest, index],
      mode: "directory",
    });
    const archive = new Uint8Array(await first.archive.arrayBuffer());

    expect(Array.from(archive.slice(10, 14))).toEqual([0, 0, 33, 0]);
    expect(second.archiveHash).toBe(first.archiveHash);
  });

  it("applies root .gitignore rules, negation, and filtered package metadata", async () => {
    const gitignore = directoryFile("node_modules/\ndist/\n*.log\n!important.log\n", "portal/.gitignore");
    const index = directoryFile("ready", "portal/src/index.ts");
    const dependency = directoryFile("dependency", "portal/node_modules/example/index.js");
    const output = directoryFile("output", "portal/dist/index.js");
    const debugLog = directoryFile("debug", "portal/debug.log");
    const importantLog = directoryFile("keep", "portal/important.log");

    const prepared = await prepareApplicationSourcePackage({
      files: [gitignore, index, dependency, output, debugLog, importantLog],
      mode: "directory",
    });
    const archive = await archiveEntries(prepared.archive);

    expect(Object.keys(archive).sort()).toEqual([
      "portal/.gitignore",
      "portal/important.log",
      "portal/src/index.ts",
    ]);
    expect(prepared.sourceFileCount).toBe(3);
    expect(prepared.uncompressedSize).toBe(gitignore.size + index.size + importantLog.size);
  });

  it("does not read file bodies that match .gitignore rules", async () => {
    let ignoredFileWasRead = false;
    const ignoredFile = {
      name: "secret.txt",
      size: 6,
      webkitRelativePath: "portal/private/secret.txt",
      arrayBuffer: async () => {
        ignoredFileWasRead = true;
        throw new Error("ignored file content must not be read");
      },
    } as unknown as File;

    const prepared = await prepareApplicationSourcePackage({
      files: [
        directoryFile("private/\n", "portal/.gitignore"),
        ignoredFile,
        directoryFile("ready", "portal/src/index.ts"),
      ],
      mode: "directory",
    });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/.gitignore",
      "portal/src/index.ts",
    ]);
    expect(ignoredFileWasRead).toBe(false);
  });

  it("honors anchored and escaped .gitignore patterns", async () => {
    const files = [
      directoryFile("/dist\n\\#notes.txt\n\\!secret.txt\n", "portal/.gitignore"),
      directoryFile("root build", "portal/dist/index.js"),
      directoryFile("nested build", "portal/packages/ui/dist/index.js"),
      directoryFile("notes", "portal/#notes.txt"),
      directoryFile("secret", "portal/!secret.txt"),
    ];

    const prepared = await prepareApplicationSourcePackage({ files, mode: "directory" });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/.gitignore",
      "portal/packages/ui/dist/index.js",
    ]);
  });

  it("applies nested .gitignore rules relative to their directory and lets them override parent file rules", async () => {
    const files = [
      directoryFile("*.log\n", "portal/.gitignore"),
      directoryFile("!important.log\ncache/\n", "portal/packages/app/.gitignore"),
      directoryFile("root", "portal/important.log"),
      directoryFile("nested", "portal/packages/app/important.log"),
      directoryFile("cache", "portal/packages/app/cache/data.json"),
      directoryFile("sibling", "portal/packages/other/important.log"),
    ];

    const prepared = await prepareApplicationSourcePackage({ files, mode: "directory" });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/.gitignore",
      "portal/packages/app/.gitignore",
      "portal/packages/app/important.log",
    ]);
  });

  it("supports recursive directory patterns and nested anchored rules", async () => {
    const files = [
      directoryFile("cache/\nbuild/**\n", "portal/.gitignore"),
      directoryFile("/private/\n*.tmp\n!keep.tmp\n", "portal/packages/app/.gitignore"),
      directoryFile("root cache", "portal/cache/root.json"),
      directoryFile("nested cache", "portal/src/cache/nested.json"),
      directoryFile("build output", "portal/build/client/app.js"),
      directoryFile("private", "portal/packages/app/private/secret.txt"),
      directoryFile("nested private", "portal/packages/app/deep/private/public.txt"),
      directoryFile("debug", "portal/packages/app/debug.tmp"),
      directoryFile("keep", "portal/packages/app/keep.tmp"),
      directoryFile("sibling", "portal/packages/other/debug.tmp"),
    ];

    const prepared = await prepareApplicationSourcePackage({ files, mode: "directory" });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/.gitignore",
      "portal/packages/app/.gitignore",
      "portal/packages/app/deep/private/public.txt",
      "portal/packages/app/keep.tmp",
      "portal/packages/other/debug.tmp",
    ]);
  });

  it("honors comments and escaped trailing spaces in .gitignore rules", async () => {
    const files = [
      directoryFile("\uFEFF# comment\r\n\r\nplain.txt   \r\nescaped.txt\\ \r\n", "portal/.gitignore"),
      directoryFile("plain", "portal/plain.txt"),
      directoryFile("escaped", "portal/escaped.txt "),
      directoryFile("regular", "portal/escaped.txt"),
      directoryFile("comment name", "portal/#comment"),
    ];

    const prepared = await prepareApplicationSourcePackage({ files, mode: "directory" });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/#comment",
      "portal/.gitignore",
      "portal/escaped.txt",
    ]);
  });

  it("does not apply nested rules or re-include files beneath an ignored parent directory", async () => {
    const files = [
      directoryFile("generated/\n!generated/keep.ts\n", "portal/.gitignore"),
      directoryFile("!keep.ts\n", "portal/generated/.gitignore"),
      directoryFile("keep", "portal/generated/keep.ts"),
      directoryFile("ready", "portal/src/index.ts"),
    ];

    const prepared = await prepareApplicationSourcePackage({ files, mode: "directory" });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/.gitignore",
      "portal/src/index.ts",
    ]);
  });

  it("rejects a directory when .gitignore excludes every selected file", async () => {
    const files = [
      directoryFile("*\n", "portal/.gitignore"),
      directoryFile("ready", "portal/src/index.ts"),
    ];

    await expect(prepareApplicationSourcePackage({ files, mode: "directory" }))
      .rejects.toThrow("No source files remain after applying .gitignore rules");
  });

  it("rejects an oversized .gitignore before reading it into browser memory", async () => {
    let wasRead = false;
    const oversizedIgnore = {
      name: ".gitignore",
      size: APPLICATION_SOURCE_MAX_IGNORE_FILE_BYTES + 1,
      webkitRelativePath: "portal/.gitignore",
      arrayBuffer: async () => {
        wasRead = true;
        throw new Error("must not read");
      },
    } as unknown as File;

    await expect(prepareApplicationSourcePackage({ files: [oversizedIgnore], mode: "directory" }))
      .rejects.toThrow("1 MiB");
    expect(wasRead).toBe(false);
  });

  it("always excludes version-control metadata from directory packages", async () => {
    const files = [
      directoryFile("!.git/config\n", "portal/.gitignore"),
      directoryFile("secret remote", "portal/.git/config"),
      directoryFile("history", "portal/.hg/store/data"),
      directoryFile("metadata", "portal/.svn/wc.db"),
      directoryFile("ready", "portal/src/index.ts"),
    ];

    const prepared = await prepareApplicationSourcePackage({ files, mode: "directory" });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/.gitignore",
      "portal/src/index.ts",
    ]);
  });

  it.each([
    ["path traversal", [directoryFile("secret", "portal/../secret.txt")]],
    ["absolute path", [directoryFile("secret", "/portal/secret.txt")]],
    ["duplicate path", [
      directoryFile("one", "portal/README.md"),
      directoryFile("two", "portal/readme.md"),
    ]],
    ["Unicode-equivalent duplicate path", [
      directoryFile("one", "portal/caf\u00e9.txt"),
      directoryFile("two", "portal/cafe\u0301.txt"),
    ]],
    ["control-character path", [directoryFile("one", "portal/src/bad\u0001.txt")]],
    ["excessive path depth", [directoryFile(
      "one",
      `portal/${Array.from({ length: APPLICATION_SOURCE_MAX_PATH_DEPTH }, () => "nested").join("/")}/index.ts`,
    )]],
  ])("rejects %s in a selected directory", async (_label, files) => {
    await expect(prepareApplicationSourcePackage({ files, mode: "directory" })).rejects.toThrow();
  });

  it("rejects empty, file-count, and byte-size limit violations before compression", async () => {
    await expect(prepareApplicationSourcePackage({ files: [], mode: "directory" })).rejects.toThrow("non-empty");

    const tooMany = Array.from(
      { length: APPLICATION_SOURCE_MAX_FILES + 1 },
      (_, index) => directoryFile("", `portal/${index}.txt`),
    );
    await expect(prepareApplicationSourcePackage({ files: tooMany, mode: "directory" })).rejects.toThrow("more than");

    const oversized = {
      name: "source.bin",
      size: APPLICATION_SOURCE_MAX_FILE_BYTES + 1,
      webkitRelativePath: "portal/source.bin",
    } as File;
    await expect(prepareApplicationSourcePackage({ files: [oversized], mode: "directory" })).rejects.toThrow("16 MiB");

    const totalOversized = Array.from(
      { length: Math.floor(APPLICATION_SOURCE_MAX_UNCOMPRESSED_BYTES / APPLICATION_SOURCE_MAX_FILE_BYTES) + 1 },
      (_, index) => sizedDirectoryFile(APPLICATION_SOURCE_MAX_FILE_BYTES, `portal/${index}.bin`),
    );
    await expect(prepareApplicationSourcePackage({ files: totalOversized, mode: "directory" })).rejects.toThrow("64 MiB");
  });

  it("applies .gitignore before enforcing the packaged file-count limit", async () => {
    const ignoredFiles = Array.from(
      { length: APPLICATION_SOURCE_MAX_SELECTED_FILES - 2 },
      (_, index) => sizedDirectoryFile(0, `portal/generated/${index}.js`),
    );
    const prepared = await prepareApplicationSourcePackage({
      files: [
        directoryFile("generated/\n", "portal/.gitignore"),
        directoryFile("ready", "portal/src/index.ts"),
        ...ignoredFiles,
      ],
      mode: "directory",
    });

    expect(Object.keys(await archiveEntries(prepared.archive)).sort()).toEqual([
      "portal/.gitignore",
      "portal/src/index.ts",
    ]);
    expect(prepared.sourceFileCount).toBe(2);
  }, 15_000);

  it("bounds aggregate selected path metadata before ignore evaluation", async () => {
    const segment = "x".repeat(240);
    const files = Array.from(
      { length: Math.ceil(APPLICATION_SOURCE_MAX_SELECTED_PATH_BYTES / 240) + 1 },
      (_, index) => sizedDirectoryFile(0, `portal/${index}-${segment}`),
    );

    await expect(prepareApplicationSourcePackage({ files, mode: "directory" }))
      .rejects.toThrow("UTF-8 path bytes");
  });

  it("stops source preparation when its abort signal is cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(prepareApplicationSourcePackage({
      files: [directoryFile("ready", "portal/src/index.ts")],
      mode: "directory",
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("keeps cancellation responsive while filtering a large selected directory", async () => {
    const controller = new AbortController();
    const files = [
      directoryFile("generated/\n", "portal/.gitignore"),
      ...Array.from(
        { length: 10_000 },
        (_, index) => sizedDirectoryFile(0, `portal/generated/${index}.js`),
      ),
    ];
    globalThis.setTimeout(() => controller.abort(), 0);

    await expect(prepareApplicationSourcePackage({
      files,
      mode: "directory",
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("application archive admission policy", () => {
  it("returns only bounded application files and excludes Drive-sanitized VCS metadata", () => {
    const validated = validateApplicationArchiveEntries([
      archiveEntry("portal/", 0, true),
      archiveEntry("portal/index.html", 12),
      archiveEntry("git/config", 48),
      archiveEntry("portal/assets/app.js", 24),
    ], { excludeDriveSanitizedVcs: true });

    expect(validated).toEqual({
      entryPaths: ["portal/index.html", "portal/assets/app.js"],
      sourceFileCount: 2,
      uncompressedSize: 36,
    });
  });

  it.each([
    ["incomplete listing", [archiveEntry("index.html", 1)], { hasMore: true }, "incomplete"],
    ["unsafe traversal", [archiveEntry("../secret.txt", 1)], {}, "unsafe"],
    ["case-insensitive duplicate", [archiveEntry("README.md", 1), archiveEntry("readme.md", 1)], {}, "duplicate"],
    ["file and child conflict", [archiveEntry("config", 1), archiveEntry("config/app.json", 1)], {}, "child path conflict"],
    ["invalid size", [{ ...archiveEntry("index.html", 1), uncompressedSizeBytes: "1e3" }], {}, "invalid file size"],
    ["oversized file", [archiveEntry("video.bin", APPLICATION_SOURCE_MAX_FILE_BYTES + 1)], {}, "16 MiB"],
  ])("rejects %s", (_label, entries, options, message) => {
    expect(() => validateApplicationArchiveEntries(entries, options)).toThrow(message);
  });
});

function directoryFile(content: string, relativePath: string): File {
  const file = new File([content], relativePath.split("/").at(-1) ?? "source.txt");
  Object.defineProperty(file, "webkitRelativePath", { value: relativePath });
  return file;
}

async function archiveEntries(archive: File): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await archive.arrayBuffer()));
}

function sizedDirectoryFile(size: number, relativePath: string): File {
  return {
    name: relativePath.split("/").at(-1) ?? "source.bin",
    size,
    webkitRelativePath: relativePath,
  } as File;
}

function archiveEntry(path: string, size: number, isDirectory = false) {
  return { isDirectory, path, uncompressedSizeBytes: String(size) };
}

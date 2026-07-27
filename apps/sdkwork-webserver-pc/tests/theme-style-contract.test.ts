import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stylesheet = readFileSync(resolve(root, "src/index.css"), "utf8");
const authStylesStart = stylesheet.indexOf(".webserver-auth-page {");
const workspaceStyles = stylesheet.slice(0, authStylesStart);

describe("webserver workspace theme styles", () => {
  it("does not mix theme text colors with fixed white surfaces", () => {
    const fixedWhiteBackgrounds = Array.from(
      workspaceStyles.matchAll(/background(?:-color)?\s*:\s*(?:white|#fff(?:fff)?)(?=\s*;)/gi),
      (match) => match[0],
    );

    expect(authStylesStart).toBeGreaterThan(0);
    expect(fixedWhiteBackgrounds).toEqual([]);
  });

  it("keeps shared workspace components on semantic theme tokens", () => {
    expect(workspaceStyles).toMatch(
      /\.table-frame\s*\{[^}]*background:\s*var\(--sdk-color-surface-panel\)/s,
    );
    expect(workspaceStyles).toMatch(
      /\.dialog\s*\{[^}]*color:\s*var\(--sdk-color-text-primary\)[^}]*background:\s*var\(--sdk-color-surface-panel\)/s,
    );
    expect(workspaceStyles).toMatch(
      /\.form-grid input[^\{]*\{[^}]*background:\s*var\(--sdk-color-surface-panel-muted\)/s,
    );
    expect(workspaceStyles).toMatch(
      /\.command-button\s*\{[^}]*color:\s*var\(--webserver-color-on-accent\)[^}]*background:\s*var\(--webserver-color-command-background\)/s,
    );
    expect(workspaceStyles).toContain('html[data-sdk-color-mode="dark"] .webserver-pc-theme');
  });
});

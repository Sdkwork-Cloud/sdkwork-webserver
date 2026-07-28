// @vitest-environment jsdom

import {
  WebserverPortal,
  webserverPortalRoute,
  type PortalClipboardPort,
  type PortalViewer,
} from "@sdkwork/webserver-pc-portal";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const navigation = {
  consoleHref: "/console",
  createApplicationHref: "/console/sites",
  deploymentsHref: "/console/deployments",
  notificationsHref: "http://127.0.0.1:5184/notifications",
} as const;

describe("WebserverPortal", () => {
  it("renders a public product entry with console and publishing routes", () => {
    renderPortal("zh-CN");

    expect(screen.getByRole("heading", { level: 1, name: "SDKWork Web Server" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Console" })[0]?.getAttribute("href")).toBe("/console");
    expect(screen.getByRole("link", { name: "通知中心" }).getAttribute("href")).toBe("http://127.0.0.1:5184/notifications");
    expect(screen.getByRole("link", { name: "发布应用" }).getAttribute("href")).toBe("/console/sites");
    expect(screen.getByRole("link", { name: "查看云部署" }).getAttribute("href")).toBe("/console/deployments");
  });

  it("keeps navigation available on compact screens and presents the authenticated viewer", () => {
    renderPortal(
      "en-US",
      { writeText: vi.fn().mockResolvedValue(undefined) },
      { label: "Ada Lovelace" },
    );

    expect(screen.getByRole("link", { name: "Signed in as Ada Lovelace" }).getAttribute("href")).toBe("/console");
    expect(screen.getByRole("link", { name: "Notification center" }).getAttribute("href")).toBe("http://127.0.0.1:5184/notifications");
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("button", { name: "Close navigation" })).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "Portal navigation" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Agent Skill" })).toHaveLength(2);
  });

  it("copies a tool-specific standards-aware skill instruction", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    renderPortal("en-US", { writeText });

    fireEvent.click(screen.getByRole("tab", { name: "Claude Code" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy integration instruction" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0]?.[0]).toContain("You are working in Claude Code");
    expect(writeText.mock.calls[0]?.[0]).toContain("sdkwork-app deploy:plan");
    expect(screen.getAllByText("Instruction copied").length).toBeGreaterThan(0);
  });

  it("surfaces clipboard failures without losing the instruction", async () => {
    renderPortal("en-US", { writeText: vi.fn().mockRejectedValue(new Error("denied")) });

    fireEvent.click(screen.getByRole("button", { name: "Copy integration instruction" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Clipboard access failed");
    expect(screen.getByText(/Do not run apply until I confirm/)).toBeTruthy();
  });
});

describe("webserverPortalRoute", () => {
  it("declares a stable public app route identity", () => {
    expect(webserverPortalRoute).toMatchObject({
      auth: "public",
      id: "app.infrastructure.portal.index",
      path: "/",
      surface: "app",
    });
  });
});

function renderPortal(
  locale: "en-US" | "zh-CN",
  clipboard: PortalClipboardPort = { writeText: vi.fn().mockResolvedValue(undefined) },
  viewer?: PortalViewer,
) {
  return render(
    <WebserverPortal clipboard={clipboard} locale={locale} navigation={navigation} viewer={viewer} />,
  );
}

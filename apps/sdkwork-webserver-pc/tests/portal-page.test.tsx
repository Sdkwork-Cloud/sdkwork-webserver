// @vitest-environment jsdom

import {
  portalAgentCatalog,
  WebserverPortal,
  webserverPortalRoute,
  type PortalClipboardPort,
  type PortalStatisticsPort,
  type PortalViewer,
} from "@sdkwork/webserver-pc-portal";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const navigation = {
  consoleHref: "/console",
  createApplicationHref: "/console/sites",
  deploymentsHref: "/console/deployments",
  documentationHref: "/docs",
  notificationsHref: "http://127.0.0.1:5184/notifications",
} as const;

describe("WebserverPortal", () => {
  it("renders a public product entry with console and publishing routes", () => {
    renderPortal("zh-CN");

    expect(screen.getByRole("heading", { level: 1, name: "SDKWork Web Server" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "首页" }).getAttribute("href")).toBe("/");
    expect(screen.getAllByRole("link", { name: "Console" })[0]?.getAttribute("href")).toBe("/console");
    expect(screen.getByRole("link", { name: "通知中心" }).getAttribute("href")).toBe("http://127.0.0.1:5184/notifications");
    expect(screen.getByRole("link", { name: "发布应用" }).getAttribute("href")).toBe("/console/sites");
    expect(screen.getByRole("link", { name: "查看云部署" }).getAttribute("href")).toBe("/console/deployments");
    expect(screen.getAllByRole("link", { name: "文档" })[0]?.getAttribute("href")).toBe("/docs");
    expect(screen.getByText("登录后查看")).toBeTruthy();
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
    expect(screen.getAllByRole("link", { name: "Home" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Agent Skill" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Docs" })).toHaveLength(2);
  });

  it("offers all seven agents and copies a tool-specific standards-aware instruction", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    renderPortal("en-US", { writeText });

    expect(portalAgentCatalog.map(({ label }) => label)).toEqual([
      "Codex",
      "Claude Code",
      "WorkBuddy",
      "OpenCode",
      "OpenClaw",
      "Herms Agent",
      "Qoder Work",
    ]);
    for (const { label } of portalAgentCatalog) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("tab", { name: "Herms Agent" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy integration instruction" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0]?.[0]).toContain("You are working in Herms Agent");
    expect(writeText.mock.calls[0]?.[0]).toContain("sdkwork-dev-app");
    expect(writeText.mock.calls[0]?.[0]).toContain("explicit Skill authority");
    expect(screen.getAllByText("Instruction copied").length).toBeGreaterThan(0);
  });

  it("surfaces clipboard failures without losing the instruction", async () => {
    renderPortal("en-US", { writeText: vi.fn().mockRejectedValue(new Error("denied")) });

    fireEvent.click(screen.getByRole("button", { name: "Copy integration instruction" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Clipboard access failed");
    expect(screen.getByText(/Do not publish to production or apply changes/)).toBeTruthy();
  });

  it("loads truthful workspace statistics only through the injected port", async () => {
    const load = vi.fn().mockResolvedValue({ deployedApplications: "42" });
    renderPortal(
      "en-US",
      { writeText: vi.fn().mockResolvedValue(undefined) },
      { label: "Ada Lovelace" },
      { load },
    );

    expect(screen.getByText("Loading")).toBeTruthy();
    expect(await screen.findByText("42")).toBeTruthy();
    expect(load).toHaveBeenCalledOnce();
  });

  it("keeps statistics failures explicit and places agent integration before capabilities", async () => {
    renderPortal(
      "en-US",
      { writeText: vi.fn().mockResolvedValue(undefined) },
      { label: "Ada Lovelace" },
      { load: vi.fn().mockRejectedValue(new Error("unavailable")) },
    );

    expect(await screen.findByText("Unavailable")).toBeTruthy();
    const agentHeading = screen.getByRole("heading", { name: "Bring deployment capability into your coding agent" });
    const capabilityHeading = screen.getByRole("heading", { name: "One governed path from artifact to public endpoint" });
    expect(agentHeading.compareDocumentPosition(capabilityHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
  statistics?: PortalStatisticsPort,
) {
  return render(
    <WebserverPortal clipboard={clipboard} locale={locale} navigation={navigation} statistics={statistics} viewer={viewer} />,
  );
}

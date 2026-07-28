// @vitest-environment jsdom

import {
  WebserverDocumentation,
  webserverDocumentationRoute,
} from "@sdkwork/webserver-pc-documentation";
import { portalAgentCatalog } from "@sdkwork/webserver-pc-portal";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const navigation = {
  consoleHref: "/console",
  notificationsHref: "http://127.0.0.1:5184/notifications",
  portalHref: "/",
} as const;

describe("WebserverDocumentation", () => {
  it("renders the public product guide and the injected agent catalog", () => {
    renderDocumentation("zh-CN");

    expect(screen.getByRole("heading", { level: 1, name: "从应用制品到稳定公网服务" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "四步发布第一个应用" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "用同一套交付模型覆盖 Cloud 与 Standalone" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "把受控发布流程带进编码会话" })).toBeTruthy();
    expect(screen.getByText("OpenClaw")).toBeTruthy();
    expect(screen.getByText("Herms Agent")).toBeTruthy();
    expect(screen.getByText("Qoder Work")).toBeTruthy();
    expect(screen.getByRole("link", { name: "前往首页复制接入指令" }).getAttribute("href")).toBe("/#skill");
  });

  it("keeps Portal, Console, notifications, and viewer navigation available", () => {
    renderDocumentation("en-US", { label: "Ada Lovelace" });

    expect(screen.getAllByRole("link", { name: "Home" })[0]?.getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Console" }).getAttribute("href")).toBe("/console");
    expect(screen.getByRole("link", { name: "Notification center" }).getAttribute("href")).toBe("http://127.0.0.1:5184/notifications");
    expect(screen.getByRole("link", { name: "Signed in as Ada Lovelace" }).getAttribute("href")).toBe("/console");
  });
});

describe("webserverDocumentationRoute", () => {
  it("declares a stable public documentation route", () => {
    expect(webserverDocumentationRoute).toMatchObject({
      auth: "public",
      id: "app.infrastructure.documentation.index",
      path: "/docs/*",
      surface: "app",
    });
  });
});

function renderDocumentation(locale: "en-US" | "zh-CN", viewer?: { label?: string }) {
  return render(
    <WebserverDocumentation
      locale={locale}
      navigation={navigation}
      supportedAgents={portalAgentCatalog.map(({ label }) => label)}
      viewer={viewer}
    />,
  );
}

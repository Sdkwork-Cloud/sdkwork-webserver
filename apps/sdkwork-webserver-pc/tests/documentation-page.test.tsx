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

    expect(screen.getByRole("heading", { level: 1, name: "把应用交付变成可规模化的业务能力" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "从创建应用到可验证上线，只需四个阶段" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "同一套发布标准，覆盖云托管与私有化交付" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "把企业发布能力嵌入 AI 协作链路" })).toBeTruthy();
    expect(screen.getByText("OpenClaw")).toBeTruthy();
    expect(screen.getByText("Herms Agent")).toBeTruthy();
    expect(screen.getByText("Qoder Work")).toBeTruthy();
    expect(screen.getByRole("link", { name: "前往 Portal 获取智能体接入指令" }).getAttribute("href")).toBe("/#skill");
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

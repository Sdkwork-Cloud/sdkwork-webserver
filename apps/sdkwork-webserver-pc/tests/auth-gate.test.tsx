// @vitest-environment jsdom

import { createSdkworkAuthController } from "@sdkwork/auth-pc-react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebserverAuthGate } from "../src/auth/WebserverAuthGate.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WebserverAuthGate", () => {
  it("bootstraps an anonymous session before redirecting to login", async () => {
    const getCurrentSession = vi.fn().mockResolvedValue(null);
    const controller = createSdkworkAuthController({ service: { getCurrentSession } });

    renderGate(controller, "/console/sites?tab=active");

    expect(screen.getByText("正在验证登录状态...")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(
      "/auth/login?redirect=%2Fconsole%2Fsites%3Ftab%3Dactive",
    ));
    expect(getCurrentSession).toHaveBeenCalledOnce();
    expect(screen.getByText("auth routes")).toBeTruthy();
  });

  it("shows an unavailable state and retries a failed bootstrap", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const getCurrentSession = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(null);
    const controller = createSdkworkAuthController({ service: { getCurrentSession } });

    renderGate(controller, "/console");

    expect(await screen.findByText("暂时无法验证登录状态。")).toBeTruthy();
    expect(screen.getByRole("link", { name: "返回 Portal 首页" }).getAttribute("href")).toBe("/");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(
      "/auth/login?redirect=%2Fconsole",
    ));
    expect(getCurrentSession).toHaveBeenCalledTimes(2);
  });

  it("redirects an authenticated user away from an auth route", async () => {
    const controller = createSdkworkAuthController({
      initialState: {
        isBootstrapped: true,
        session: {
          accessToken: "access-token",
          authToken: "auth-token",
        },
      },
    });

    renderGate(controller, "/auth/login?redirect=%2Fadmin%2Fservers");

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(
      "/admin/servers",
    ));
    expect(screen.getByText("protected application")).toBeTruthy();
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderGate(
  controller: ReturnType<typeof createSdkworkAuthController>,
  initialEntry: string,
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <WebserverAuthGate
        authRoutes={<div>auth routes</div>}
        controller={controller}
        locale="zh-CN"
      >
        <div>protected application</div>
      </WebserverAuthGate>
      <LocationProbe />
    </MemoryRouter>,
  );
}

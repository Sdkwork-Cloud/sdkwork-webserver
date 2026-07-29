// @vitest-environment jsdom

import {
  createDefaultApplicationIcon,
  validateApplicationMediaFile,
  validateApplicationPreviewCount,
} from "@sdkwork/webserver-pc-commons";
import { createApplicationMediaStorage } from "@sdkwork/webserver-pc-console-core";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("application store media", () => {
  it("generates an opaque 1024 square PNG default icon", async () => {
    const drawingContext = {
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      fillStyle: "",
      font: "",
      textAlign: "start",
      textBaseline: "alphabetic",
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      drawingContext as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      callback(new Blob(["opaque-png"], { type: type ?? "image/png" }));
    });

    const icon = await createDefaultApplicationIcon("Commercial Portal");

    expect(icon.name).toBe("application-icon.png");
    expect(icon.type).toBe("image/png");
    expect(drawingContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
    expect(drawingContext.fillText).toHaveBeenCalledWith("C", 512, 535, 720);
  });

  it("enforces store dimensions, formats, sizes, and preview count before upload", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      close: vi.fn(),
      height: 1024,
      width: 1024,
    }));
    const icon = fileWithBytes("icon.png", "image/png", 1024);
    await expect(validateApplicationMediaFile("icon", icon)).resolves.toEqual({
      height: 1024,
      width: 1024,
    });
    await expect(validateApplicationMediaFile(
      "icon",
      fileWithBytes("icon.jpg", "image/jpeg", 1024),
    )).rejects.toThrow("ICON_TYPE");
    expect(() => validateApplicationPreviewCount(Array.from({ length: 10 }, () => icon))).not.toThrow();
    expect(() => validateApplicationPreviewCount(Array.from({ length: 11 }, () => icon))).toThrow(
      "PREVIEW_COUNT",
    );
  });

  it("uploads through the injected Drive image uploader and returns stable MediaResource identity", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      close: vi.fn(),
      height: 1024,
      width: 1024,
    }));
    const uploadImage = vi.fn().mockResolvedValue({
      uploadSession: { nodeId: "icon-node", spaceId: "store-assets" },
    });
    const storage = createApplicationMediaStorage({
      uploader: { uploadImage },
    } as never);
    const icon = fileWithBytes("icon.png", "image/png", 1024);

    const resource = await storage.store({
      altText: "Portal icon",
      applicationId: "app-1",
      file: icon,
      role: "icon",
    });

    expect(uploadImage).toHaveBeenCalledWith(expect.objectContaining({
      appResourceId: "app-1",
      appResourceType: "web.application.media.icon",
      contentType: "image/png",
      file: icon,
      scene: "application-store-listing",
    }));
    expect(resource).toEqual(expect.objectContaining({
      id: "icon-node",
      kind: "image",
      source: "drive",
      uri: "drive://spaces/store-assets/nodes/icon-node",
      width: 1024,
      height: 1024,
      metadata: { drive: { nodeId: "icon-node", spaceId: "store-assets" } },
    }));
    expect(resource).not.toHaveProperty("url");
  });
});

function fileWithBytes(name: string, type: string, size: number): File {
  const bytes = new Uint8Array(size);
  const file = new File([bytes], name, { type });
  if (typeof file.arrayBuffer !== "function") {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => bytes.buffer,
    });
  }
  return file;
}

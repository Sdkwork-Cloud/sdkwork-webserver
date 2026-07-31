import { normalizeWebserverPage } from "@sdkwork/webserver-pc-commons";
import { describe, expect, it } from "vitest";

describe("webserver page normalization", () => {
  it("unwraps the standard SDKWork page envelope and parses totalItems", () => {
    expect(normalizeWebserverPage({
      code: 0,
      data: {
        items: [{ id: "certificate-1" }],
        pageInfo: { mode: "offset", page: 2, pageSize: 20, totalItems: "41" },
      },
      traceId: "trace-page-1",
    })).toEqual({
      items: [{ id: "certificate-1" }],
      pageInfo: { hasMore: true, page: 2, pageSize: 20, total: 41 },
    });
  });

  it("does not coerce an unsafe totalItems value", () => {
    expect(normalizeWebserverPage({
      items: [],
      pageInfo: { mode: "offset", page: 1, pageSize: 20, totalItems: "9007199254740992" },
    }).pageInfo).toEqual({ hasMore: false, page: 1, pageSize: 20, total: undefined });
  });
});

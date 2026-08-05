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
      pageInfo: { hasMore: true, mode: "offset", page: 2, pageSize: 20, total: 41 },
    });
  });

  it("does not coerce an unsafe totalItems value", () => {
    expect(normalizeWebserverPage({
      items: [],
      pageInfo: { mode: "offset", page: 1, pageSize: 20, totalItems: "9007199254740992" },
    }).pageInfo).toEqual({ hasMore: false, mode: "offset", page: 1, pageSize: 20, total: undefined });
  });

  it("preserves cursor mode and nextCursor from the page envelope", () => {
    expect(normalizeWebserverPage({
      items: [{ id: "audit-1" }],
      pageInfo: { mode: "cursor", page: 0, pageSize: 20, nextCursor: "djF8fA", hasMore: true },
    })).toEqual({
      items: [{ id: "audit-1" }],
      pageInfo: { hasMore: true, mode: "cursor", page: 1, pageSize: 20, total: undefined, nextCursor: "djF8fA" },
    });
  });
});

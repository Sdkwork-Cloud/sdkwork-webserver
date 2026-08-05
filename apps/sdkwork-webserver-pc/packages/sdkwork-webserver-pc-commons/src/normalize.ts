import type { WebserverResourcePage } from "./types.ts";

export function normalizeWebserverPage(value: unknown): WebserverResourcePage {
  const candidate = unwrap(value);
  if (Array.isArray(candidate))
    return { items: candidate.map(toRecord), pageInfo: { page: 1, pageSize: candidate.length, hasMore: false, mode: "offset" } };
  if (!isRecord(candidate))
    return { items: [], pageInfo: { page: 1, pageSize: 20, hasMore: false, mode: "offset" } };
  const items = Array.isArray(candidate.items) ? candidate.items.map(toRecord) : [candidate];
  const info = isRecord(candidate.pageInfo) ? candidate.pageInfo : {};
  const page = positiveInteger(info.page, 1);
  const pageSize = positiveInteger(info.pageSize, Math.max(items.length, 20));
  const total = nonNegativeSafeInteger(info.totalItems);
  const nextCursor = typeof info.nextCursor === "string" && info.nextCursor.length > 0 ? info.nextCursor : undefined;
  const mode = info.mode === "cursor" ? "cursor" : "offset";
  return {
    items,
    pageInfo: {
      page,
      pageSize,
      total,
      nextCursor,
      mode,
      hasMore: typeof info.hasMore === "boolean"
        ? info.hasMore
        : total === undefined
          ? items.length >= pageSize
          : page * pageSize < total,
    },
  };
}

function unwrap(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (isRecord(value.data)) {
    if ("items" in value.data || "pageInfo" in value.data) return value.data;
    if ("resource" in value.data) return value.data.resource;
  }
  return value;
}

function positiveInteger(value: unknown, fallback: number): number { return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback; }
function nonNegativeSafeInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
function toRecord(value: unknown): Record<string, unknown> { return isRecord(value) ? value : { value }; }
export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

import {
  formatWebserverErrorMessage,
  pollWebserverOperation,
  translateWebserver,
  WebserverOperationError,
  type WebserverOperation,
} from "@sdkwork/webserver-pc-commons";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.useRealTimers());

describe("webserver operation polling", () => {
  it("polls pending and running operations until they succeed", async () => {
    vi.useFakeTimers();
    const retrieve = vi.fn()
      .mockResolvedValueOnce(operation("PENDING"))
      .mockResolvedValueOnce(operation("RUNNING"))
      .mockResolvedValueOnce(operation("SUCCEEDED"));

    const result = pollWebserverOperation("operation-1", retrieve, {
      intervalMs: 10,
      timeoutMs: 1_000,
    });
    await vi.advanceTimersByTimeAsync(20);

    await expect(result).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(retrieve).toHaveBeenCalledTimes(3);
    expect(retrieve).toHaveBeenLastCalledWith(
      "operation-1",
      expect.objectContaining({ signal: expect.any(AbortSignal), timeout: 30_000 }),
    );
  });

  it("exposes a stable server failure code through localized errors", async () => {
    const retrieve = vi.fn().mockResolvedValue(operation(
      "FAILED",
      "CERTIFICATE_OPERATION_LEASE_EXPIRED",
    ));

    const error = await pollWebserverOperation("operation-2", retrieve).catch((cause) => cause);

    expect(error).toBeInstanceOf(WebserverOperationError);
    expect(error).toMatchObject({
      failureCode: "CERTIFICATE_OPERATION_LEASE_EXPIRED",
      kind: "failed",
      operationId: "operation-2",
    });
    expect(formatWebserverErrorMessage(
      error,
      (key, values) => translateWebserver("en-US", key, values),
    )).toContain("CERTIFICATE_OPERATION_LEASE_EXPIRED");
  });

  it("stops scheduling polls when browser polling is aborted", async () => {
    vi.useFakeTimers();
    const abortController = new AbortController();
    const retrieve = vi.fn().mockResolvedValue(operation("PENDING"));
    const result = pollWebserverOperation("operation-3", retrieve, {
      intervalMs: 10,
      signal: abortController.signal,
      timeoutMs: 1_000,
    });
    const rejection = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(0);
    expect(retrieve).toHaveBeenCalledTimes(1);

    abortController.abort();
    await rejection;
    await vi.advanceTimersByTimeAsync(100);
    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it("enforces the overall polling timeout", async () => {
    vi.useFakeTimers();
    const retrieve = vi.fn().mockResolvedValue(operation("RUNNING"));
    const result = pollWebserverOperation("operation-4", retrieve, {
      intervalMs: 10,
      timeoutMs: 25,
    });
    const rejection = expect(result).rejects.toMatchObject({
      failureCode: "CERTIFICATE_OPERATION_POLL_TIMEOUT",
      kind: "timeout",
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(retrieve).toHaveBeenCalledTimes(3);
  });
});

function operation(
  status: WebserverOperation["status"],
  failureCode?: string,
): WebserverOperation & { id: string } {
  return { failureCode, id: "operation-result", status };
}

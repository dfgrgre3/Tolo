import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/api-client";
import {
  offlineMutationQueue,
  newClientOpId,
} from "@/lib/sync/offline-queue";

vi.mock("@/lib/api/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/api-client")>(
    "@/lib/api/api-client"
  );
  return {
    ...actual,
    apiClient: {
      postJson: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

function mockOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    value,
    configurable: true,
  });
}

describe("offlineMutationQueue (P1-26)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockOnline(true);
    for (const m of [...offlineMutationQueue.pendingByKind("note")]) {
      offlineMutationQueue.remove(m.id);
    }
  });

  it("dedupes re-enqueued clientOpIds instead of duplicating", () => {
    offlineMutationQueue.enqueue({
      id: "op-1",
      kind: "note",
      method: "POST",
      endpoint: "/api/courses/lessons/l-1/notes/items",
      body: { text: "a" },
    });
    offlineMutationQueue.enqueue({
      id: "op-1",
      kind: "note",
      method: "POST",
      endpoint: "/api/courses/lessons/l-1/notes/items",
      body: { text: "b" },
    });
    const pending = offlineMutationQueue.pendingByKind("note");
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ id: "op-1", body: { text: "b" } });
  });

  it("flushes FIFO with the Idempotency-Key header and settles callbacks", async () => {
    vi.mocked(apiClient.postJson).mockResolvedValueOnce({ data: { id: "srv-1" } });
    const settled = vi.fn();
    offlineMutationQueue.enqueue({
      id: "op-2",
      kind: "note",
      method: "POST",
      endpoint: "/api/courses/lessons/l-1/notes/items",
      body: { text: "hi" },
      onSettled: settled,
    });

    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith(true, { data: { id: "srv-1" } }));
    expect(apiClient.postJson).toHaveBeenCalledWith(
      "/api/courses/lessons/l-1/notes/items",
      { text: "hi" },
      { headers: { "Idempotency-Key": "op-2" } }
    );
    expect(offlineMutationQueue.pendingByKind("note")).toHaveLength(0);
  });

  it("drops permanent 4xx failures but keeps retryable ones queued", async () => {
    const err404 = Object.assign(new Error("not found"), { status: 404 });
    vi.mocked(apiClient.postJson).mockRejectedValueOnce(err404);
    const settled = vi.fn();
    offlineMutationQueue.enqueue({
      id: "op-3",
      kind: "note",
      method: "POST",
      endpoint: "/api/x",
      body: {},
      onSettled: settled,
    });
    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith(false, err404));
    expect(offlineMutationQueue.pendingByKind("note")).toHaveLength(0);

    vi.mocked(apiClient.postJson).mockRejectedValueOnce(new Error("down"));
    offlineMutationQueue.enqueue({
      id: "op-4",
      kind: "note",
      method: "POST",
      endpoint: "/api/x",
      body: {},
    });
    await vi.waitFor(() => expect(apiClient.postJson).toHaveBeenCalledTimes(2));
    // Retryable failure stays queued with backoff.
    expect(offlineMutationQueue.pendingByKind("note")).toHaveLength(1);
  });

  it("generates unique client op ids", () => {
    expect(newClientOpId("note")).not.toBe(newClientOpId("note"));
  });
});

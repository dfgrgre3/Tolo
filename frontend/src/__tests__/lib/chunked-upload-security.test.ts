import { describe, it, expect, vi, beforeEach } from "vitest";

// Redis double: records eval/defineCommand usage so the tests can prove the
// Lua body is always the frozen module constant and untrusted input travels
// only via KEYS/ARGV (never string-interpolated into script text).
const evalCalls: Array<{ script: string; keyCount: number; args: string[] }> = [];
let defineCommandCalls: Array<{ name: string; lua: string; numberOfKeys: number }> = [];

const mockRedis = {
  pipeline: vi.fn(() => ({
    hset: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    hincrby: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  })),
  defineCommand: vi.fn((name: string, opts: { lua: string; numberOfKeys: number }) => {
    defineCommandCalls.push({ name, ...opts });
    // ioredis attaches the new command onto the client instance.
    (mockRedis as Record<string, unknown>)[name] = vi.fn(
      async (key: string, expectedFrom: string, nextStatus: string) => {
        expect(typeof key).toBe("string");
        expect(typeof expectedFrom).toBe("string");
        expect(typeof nextStatus).toBe("string");
        return 1;
      },
    );
  }),
  eval: vi.fn(async (script: string, keyCount: number, ...args: string[]) => {
    evalCalls.push({ script, keyCount, args });
    return 1;
  }),
  hset: vi.fn().mockResolvedValue(1),
};

vi.mock("@/lib/redis/client", () => ({
  getRedisClient: vi.fn(() => mockRedis),
}));

import {
  compareAndSetSessionStatus,
  initiateUpload,
  registerChunk,
  updateSessionStatus,
  cleanupUpload,
} from "@/lib/redis/chunked-upload";

describe("chunked-upload trust boundary (B-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evalCalls.length = 0;
    defineCommandCalls = [];
    delete (mockRedis as Record<string, unknown>).casUploadStatus;
  });

  it("rejects key-namespace hostile uploadIds before touching Redis", async () => {
    const hostile = [
      "a{b}c", // cluster hash-tag / slot steering
      "x y", // whitespace (log injection)
      "x\ny", // newline (log injection)
      "../escape",
      "",
      "x".repeat(129), // over-long
      "café", // non-ASCII
    ];
    for (const id of hostile) {
      await expect(compareAndSetSessionStatus(id, "COMPLETING", null)).rejects.toThrow(
        /Invalid uploadId/,
      );
      await expect(cleanupUpload(id)).rejects.toThrow(/Invalid uploadId/);
      await expect(updateSessionStatus(id, "UPLOADING")).rejects.toThrow(
        /Invalid uploadId/,
      );
    }
    expect(mockRedis.eval).not.toHaveBeenCalled();
    expect(mockRedis.hset).not.toHaveBeenCalled();
  });

  it("accepts well-formed ids (uuid-style)", async () => {
    await expect(
      compareAndSetSessionStatus("550e8400-e29b-41d4-a716-446655440000", "COMPLETING", null),
    ).resolves.toBe("ok");
  });

  it("rejects unknown statuses at runtime (TS unions evaporate)", async () => {
    await expect(
      updateSessionStatus("valid-id_1", "SUPERADMIN" as never),
    ).rejects.toThrow(/Invalid upload status/);
    await expect(
      compareAndSetSessionStatus("valid-id_1", "COMPLETED", "BOGUS" as never),
    ).rejects.toThrow(/Invalid upload status/);
    expect(mockRedis.eval).not.toHaveBeenCalled();
    expect(mockRedis.hset).not.toHaveBeenCalled();
  });

  it("CAS executes the constant script with data-only KEYS/ARGV (no interpolation)", async () => {
    const evilId = "valid-id_1";
    await compareAndSetSessionStatus(evilId, "COMPLETING", null);
    // Preferred path: defineCommand registers the frozen script once…
    expect(defineCommandCalls).toHaveLength(1);
    const registered = defineCommandCalls[0];
    expect(registered).toBeDefined();
    expect(registered!.numberOfKeys).toBe(1);
    const lua = registered!.lua;
    // …and the attack surface is absent from the script text itself.
    expect(lua).not.toContain(evilId);
    expect(lua).toContain("KEYS[1]");
    expect(lua).toContain("ARGV");
  });

  it("eval fallback (minimal clients) still uses the constant script", async () => {
    const noDefine = { eval: mockRedis.eval };
    const clientModule = await import("@/lib/redis/client");
    vi.mocked(clientModule.getRedisClient).mockReturnValueOnce(noDefine as never);
    await compareAndSetSessionStatus("valid-id_2", "COMPLETED", "COMPLETING");
    expect(evalCalls).toHaveLength(1);
    const call = evalCalls[0];
    expect(call).toBeDefined();
    expect(call!.keyCount).toBe(1);
    // uploadId travels as KEYS[1], statuses as ARGV — none inside the script.
    expect(call!.args[0]).toBe("chunked_upload:session:valid-id_2");
    expect(call!.args[1]).toBe("COMPLETING");
    expect(call!.args[2]).toBe("COMPLETED");
    expect(call!.script).not.toContain("valid-id_2");
    expect(call!.script).not.toContain("COMPLETING");
  });

  it("rejects inconsistent session grids and bad chunk args at creation", async () => {
    const base = {
      uploadId: "valid-id_3",
      fileName: "video.mp4",
      mimeType: "video/mp4",
      chunkSize: 1000,
      totalChunks: 3,
      folder: "uploads",
      userId: "user-1",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    // fileSize 5000 cannot fit in 3x1000.
    await expect(initiateUpload({ ...base, fileSize: 5000 })).rejects.toThrow(
      /does not fit/,
    );
    await expect(
      registerChunk("valid-id_3", 0, 0, "path/0"),
    ).rejects.toThrow(/chunkSize/);
    await expect(
      registerChunk("valid-id_3", 0, 100, "path/0", "not-a-sha256"),
    ).rejects.toThrow(/checksum/);
  });
});

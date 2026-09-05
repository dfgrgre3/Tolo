import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock redis client
const mockPipeline = {
  hset: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  hincrby: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([
    [null, "1"],
    [null, "1024"],
  ]),
};

const seenSet = new Set<string>();
let mockMeta: Record<string, string> = {
  receivedChunks: "0",
  totalSize: "0",
};

const mockRedis = {
  pipeline: vi.fn(() => mockPipeline),
  sadd: vi.fn(async (_key: string, member: string) => {
    if (seenSet.has(member)) return 0;
    seenSet.add(member);
    return 1;
  }),
  zadd: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn(async () => mockMeta),
  hget: vi.fn(async () => "CREATED"),
  hset: vi.fn().mockResolvedValue(1),
};

vi.mock("@/lib/redis/client", () => ({
  getRedisClient: vi.fn(() => mockRedis),
}));

import { registerChunk } from "@/lib/redis/chunked-upload";

describe("registerChunk idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seenSet.clear();
    mockMeta = {
      receivedChunks: "0",
      totalSize: "0",
    };
  });

  it("increments counters when a chunk is registered for the first time", async () => {
    mockMeta = { receivedChunks: "1", totalSize: "1024" };
    const res = await registerChunk("upload-1", 0, 1024, "path/0");

    expect(res.isDuplicate).toBe(false);
    expect(res.receivedChunks).toBe(1);
    expect(res.totalSize).toBe(1024);
    expect(mockPipeline.hincrby).toHaveBeenCalledWith(expect.any(String), "receivedChunks", 1);
    expect(mockPipeline.hincrby).toHaveBeenCalledWith(expect.any(String), "totalSize", 1024);
  });

  it("does not increment counters when the same chunk is retried", async () => {
    // First registration
    mockMeta = { receivedChunks: "1", totalSize: "1024" };
    await registerChunk("upload-1", 1, 1024, "path/1");

    vi.clearAllMocks();

    // Re-registration of the same chunk index (retry scenario)
    const duplicateRes = await registerChunk("upload-1", 1, 1024, "path/1");

    expect(duplicateRes.isDuplicate).toBe(true);
    expect(duplicateRes.receivedChunks).toBe(1);
    expect(duplicateRes.totalSize).toBe(1024);
    // hincrby should NOT be invoked on retry
    expect(mockPipeline.hincrby).not.toHaveBeenCalled();
  });
});

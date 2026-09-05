import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPipeline = {
  hset: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  hincrby: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

let mockSessionMeta: Record<string, string> | null = null;
let mockChunks: string[] = [];

const mockRedis = {
  pipeline: vi.fn(() => mockPipeline),
  sadd: vi.fn().mockResolvedValue(1),
  zadd: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn(async () => mockSessionMeta),
  hget: vi.fn(async (_key: string, field: string) => mockSessionMeta ? mockSessionMeta[field] : null),
  hset: vi.fn(async (_key: string, fieldOrObj: any, val?: any) => {
    if (typeof fieldOrObj === "string" && mockSessionMeta) {
      mockSessionMeta[fieldOrObj] = String(val);
    } else if (typeof fieldOrObj === "object" && mockSessionMeta) {
      Object.assign(mockSessionMeta, fieldOrObj);
    }
    return 1;
  }),
  zrange: vi.fn(async () => mockChunks),
  del: vi.fn().mockResolvedValue(1),
};

vi.mock("@/lib/redis/client", () => ({
  getRedisClient: vi.fn(() => mockRedis),
}));

import {
  initiateUpload,
  validateUploadCompletion,
  updateSessionStatus,
  getSessionMeta,
} from "@/lib/redis/chunked-upload";

describe("chunked-upload state machine and completion validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionMeta = {
      uploadId: "test-upload-123",
      fileName: "video.mp4",
      fileSize: "3000",
      mimeType: "video/mp4",
      totalChunks: "3",
      chunkSize: "1000",
      folder: "uploads",
      userId: "user-1",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      status: "CREATED",
    };
    mockChunks = [];
  });

  describe("Session creation and state transitions", () => {
    it("initializes session with CREATED status", async () => {
      await initiateUpload({
        uploadId: "test-upload-123",
        fileName: "video.mp4",
        fileSize: 3000,
        mimeType: "video/mp4",
        totalChunks: 3,
        chunkSize: 1000,
        folder: "uploads",
        userId: "user-1",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      expect(mockPipeline.hset).toHaveBeenCalledWith(
        expect.stringContaining("test-upload-123"),
        expect.objectContaining({
          status: "CREATED",
          totalChunks: "3",
        })
      );
    });

    it("updates session status to UPLOADING, COMPLETING, COMPLETED", async () => {
      await updateSessionStatus("test-upload-123", "UPLOADING");
      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringContaining("test-upload-123"),
        "status",
        "UPLOADING"
      );

      await updateSessionStatus("test-upload-123", "COMPLETING");
      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringContaining("test-upload-123"),
        "status",
        "COMPLETING"
      );

      await updateSessionStatus("test-upload-123", "COMPLETED");
      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringContaining("test-upload-123"),
        "status",
        "COMPLETED"
      );
    });

    it("detects expired sessions", async () => {
      if (mockSessionMeta) {
        mockSessionMeta.expiresAt = new Date(Date.now() - 10000).toISOString();
      }
      const session = await getSessionMeta("test-upload-123");
      expect(session?.status).toBe("EXPIRED");
    });
  });

  describe("validateUploadCompletion", () => {
    it("fails when chunk count is less than totalChunks", async () => {
      mockChunks = [
        JSON.stringify({ index: 0, size: 1000, path: "p0" }),
        JSON.stringify({ index: 1, size: 1000, path: "p1" }),
      ];

      const res = await validateUploadCompletion("test-upload-123");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Chunk count mismatch");
    });

    it("fails when there is a missing index gap (e.g. index 0 and index 2, but missing index 1)", async () => {
      mockChunks = [
        JSON.stringify({ index: 0, size: 1000, path: "p0" }),
        JSON.stringify({ index: 2, size: 1000, path: "p2" }),
        JSON.stringify({ index: 3, size: 1000, path: "p3" }),
      ];

      const res = await validateUploadCompletion("test-upload-123");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Missing chunk at index 1");
    });

    it("fails when sum(chunk.size) does not match session declared fileSize", async () => {
      mockChunks = [
        JSON.stringify({ index: 0, size: 1000, path: "p0" }),
        JSON.stringify({ index: 1, size: 1000, path: "p1" }),
        JSON.stringify({ index: 2, size: 900, path: "p2" }), // 2900 total instead of 3000
      ];

      const res = await validateUploadCompletion("test-upload-123");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("File size mismatch");
    });

    it("fails when checksum format is invalid", async () => {
      mockChunks = [
        JSON.stringify({ index: 0, size: 1000, path: "p0", checksum: "invalid-not-sha256" }),
        JSON.stringify({ index: 1, size: 1000, path: "p1" }),
        JSON.stringify({ index: 2, size: 1000, path: "p2" }),
      ];

      const res = await validateUploadCompletion("test-upload-123");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Invalid checksum format");
    });

    it("passes when all indices [0 ... totalChunks - 1] exist and size matches exactly", async () => {
      const validHash = "a".repeat(64);
      mockChunks = [
        JSON.stringify({ index: 0, size: 1000, path: "p0", checksum: validHash }),
        JSON.stringify({ index: 1, size: 1000, path: "p1" }),
        JSON.stringify({ index: 2, size: 1000, path: "p2" }),
      ];

      const res = await validateUploadCompletion("test-upload-123");
      expect(res.valid).toBe(true);
      expect(res.chunks).toHaveLength(3);
      expect(res.totalSize).toBe(3000);
    });
  });
});

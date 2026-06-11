import { getRedisClient } from './client';

// ─── Redis Key Namespaces ────────────────────────────────────────────────
const UPLOAD_SESSION_PREFIX = 'chunked_upload:session:';
const UPLOAD_CHUNKS_PREFIX = 'chunked_upload:chunks:';
const UPLOAD_META_PREFIX = 'chunked_upload:meta:';

// ─── Types ────────────────────────────────────────────────────────────────

export interface UploadSessionMeta {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
  folder: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ChunkInfo {
  index: number;
  size: number;
  uploadedAt: string;
}

// ─── Session TTL ─────────────────────────────────────────────────────────
const SESSION_TTL_SECONDS = 3600; // 1 hour

// ─── Helpers ─────────────────────────────────────────────────────────────

function sessionKey(uploadId: string): string {
  return `${UPLOAD_SESSION_PREFIX}${uploadId}`;
}

function metaKey(uploadId: string): string {
  return `${UPLOAD_META_PREFIX}${uploadId}`;
}

function chunksKey(uploadId: string): string {
  return `${UPLOAD_CHUNKS_PREFIX}${uploadId}`;
}

/**
 * Validate that Redis is available. Throws if not.
 */
function assertRedis() {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis is not available. Chunked uploads require Redis.');
  }
  return redis;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Initiate a new chunked upload session.
 * Stores metadata in a Redis hash and creates a set for tracking chunks.
 */
export async function initiateUpload(session: UploadSessionMeta): Promise<void> {
  const redis = assertRedis();

  const pipeline = redis.pipeline();

  // Store session metadata as a hash
  pipeline.hset(sessionKey(session.uploadId), {
    uploadId: session.uploadId,
    fileName: session.fileName,
    fileSize: String(session.fileSize),
    mimeType: session.mimeType,
    totalChunks: String(session.totalChunks),
    chunkSize: String(session.chunkSize),
    folder: session.folder,
    userId: session.userId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    status: 'pending',
  });

  // Set TTL on session metadata
  pipeline.expire(sessionKey(session.uploadId), SESSION_TTL_SECONDS);

  // Create a sorted set for chunk tracking (score = chunk index)
  pipeline.del(chunksKey(session.uploadId));
  pipeline.expire(chunksKey(session.uploadId), SESSION_TTL_SECONDS);

  // Set TTL on stored chunk data reference
  pipeline.del(metaKey(session.uploadId));
  pipeline.hset(metaKey(session.uploadId), {
    receivedChunks: '0',
    totalSize: '0',
  });
  pipeline.expire(metaKey(session.uploadId), SESSION_TTL_SECONDS);

  await pipeline.exec();
}

/**
 * Register a successfully uploaded chunk.
 * Updates the chunk tracking in Redis.
 */
export async function registerChunk(
  uploadId: string,
  chunkIndex: number,
  chunkSize: number,
  storedPath: string
): Promise<{ receivedChunks: number; totalSize: number }> {
  const redis = assertRedis();

  // Add chunk info to sorted set (score = index for ordering)
  await redis.zadd(
    chunksKey(uploadId),
    chunkIndex,
    JSON.stringify({ index: chunkIndex, size: chunkSize, path: storedPath })
  );

  // Update meta counters
  const pipeline = redis.pipeline();
  pipeline.hincrby(metaKey(uploadId), 'receivedChunks', 1);
  pipeline.hincrby(metaKey(uploadId), 'totalSize', chunkSize);
  const results = await pipeline.exec();

  const receivedChunks = parseInt((results?.[0]?.[1] as string) || '0', 10);
  const totalSize = parseInt((results?.[1]?.[1] as string) || '0', 10);

  // Refresh TTL
  await redis.expire(chunksKey(uploadId), SESSION_TTL_SECONDS);
  await redis.expire(metaKey(uploadId), SESSION_TTL_SECONDS);

  return { receivedChunks, totalSize };
}

/**
 * Get all chunks for an upload session, ordered by index.
 * Returns the stored file paths for reassembly.
 */
export async function getOrderedChunks(
  uploadId: string
): Promise<{ index: number; size: number; path: string }[]> {
  const redis = assertRedis();

  const raw = await redis.zrange(chunksKey(uploadId), 0, -1);
  return raw.map((entry) => JSON.parse(entry));
}

/**
 * Get the session metadata.
 */
export async function getSessionMeta(
  uploadId: string
): Promise<UploadSessionMeta | null> {
  const redis = assertRedis();

  const data = await redis.hgetall(sessionKey(uploadId));
  if (!data || !data.uploadId) {
    return null;
  }

  // Parse back numeric fields
  return {
    ...data,
    fileSize: parseInt(data.fileSize ?? '0', 10),
    totalChunks: parseInt(data.totalChunks ?? '0', 10),
    chunkSize: parseInt(data.chunkSize ?? '0', 10),
  } as unknown as UploadSessionMeta;
}

/**
 * Check if all chunks have been received.
 */
export async function isUploadComplete(uploadId: string): Promise<boolean> {
  const meta = await getSessionMeta(uploadId);
  if (!meta) return false;

  const receivedChunksCount = await redisChunkCount(uploadId);
  return receivedChunksCount >= meta.totalChunks;
}

/**
 * Get the current received chunk count.
 */
async function redisChunkCount(uploadId: string): Promise<number> {
  const redis = assertRedis();
  const count = await redis.zcard(chunksKey(uploadId));
  return count ?? 0;
}

/**
 * Get the total received size for the upload.
 */
export async function getUploadProgress(
  uploadId: string
): Promise<{ receivedChunks: number; totalChunks: number; totalSize: number } | null> {
  const redis = assertRedis();
  const session = await getSessionMeta(uploadId);
  if (!session) return null;

  const meta = await redis.hgetall(metaKey(uploadId));
  if (!meta) return null;

  return {
    receivedChunks: parseInt(meta.receivedChunks || '0', 10),
    totalChunks: session.totalChunks,
    totalSize: parseInt(meta.totalSize || '0', 10),
  };
}

/**
 * Mark the upload session as completed (status = 'completed').
 * This prevents reuse after the final assembly.
 */
export async function markUploadCompleted(uploadId: string): Promise<void> {
  const redis = assertRedis();
  await redis.hset(sessionKey(uploadId), 'status', 'completed');
}

/**
 * Delete all Redis keys associated with an upload session (cleanup).
 */
export async function cleanupUpload(uploadId: string): Promise<void> {
  const redis = assertRedis();
  const pipeline = redis.pipeline();
  pipeline.del(sessionKey(uploadId));
  pipeline.del(chunksKey(uploadId));
  pipeline.del(metaKey(uploadId));
  await pipeline.exec();
}
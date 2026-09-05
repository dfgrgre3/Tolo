import { getRedisClient } from './client';

// ─── Redis Key Namespaces ────────────────────────────────────────────────
const UPLOAD_SESSION_PREFIX = 'chunked_upload:session:';
const UPLOAD_CHUNKS_PREFIX = 'chunked_upload:chunks:';
const UPLOAD_META_PREFIX = 'chunked_upload:meta:';

// ─── Types ────────────────────────────────────────────────────────────────

export type UploadSessionStatus = 'CREATED' | 'UPLOADING' | 'COMPLETING' | 'COMPLETED' | 'EXPIRED';

export interface UploadSessionMeta {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
  folder: string;
  userId: string;
  status: UploadSessionStatus;
  createdAt: string;
  expiresAt: string;
}

export interface ChunkInfo {
  index: number;
  size: number;
  path: string;
  uploadedAt: string;
  /** SHA-256 hex digest of the chunk data supplied by the client, stored for
   * integrity verification during re-assembly. Optional: absent for legacy
   * uploads that pre-date checksum enforcement. */
  checksum?: string;
}

export interface CompletionValidationResult {
  valid: boolean;
  error?: string;
  chunks: ChunkInfo[];
  totalSize: number;
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

function chunkTrackKey(uploadId: string): string {
  return `chunked_upload:seen:${uploadId}`;
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
 * Stores metadata in a Redis hash and initializes tracking structures.
 * Sets initial status to 'CREATED'.
 */
export async function initiateUpload(
  session: Omit<UploadSessionMeta, 'status'> & { status?: UploadSessionStatus }
): Promise<void> {
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
    status: session.status || 'CREATED',
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

  // Reset seen chunks tracking set
  pipeline.del(chunkTrackKey(session.uploadId));
  pipeline.expire(chunkTrackKey(session.uploadId), SESSION_TTL_SECONDS);

  await pipeline.exec();
}

/**
 * Update the status of an upload session.
 */
export async function updateSessionStatus(
  uploadId: string,
  status: UploadSessionStatus
): Promise<void> {
  const redis = assertRedis();
  await redis.hset(sessionKey(uploadId), 'status', status);
}

/**
 * Register a successfully uploaded chunk.
 * Updates the chunk tracking in Redis idempotently.
 * If the chunk was already registered (e.g. client retry), counters are not incremented twice.
 * Automatically marks status as 'UPLOADING' if previously 'CREATED'.
 */
export async function registerChunk(
  uploadId: string,
  chunkIndex: number,
  chunkSize: number,
  storedPath: string,
  checksum?: string,
): Promise<{ receivedChunks: number; totalSize: number; isDuplicate?: boolean }> {
  const redis = assertRedis();

  // SADD returns 1 if chunkIndex was newly added, 0 if it was already present
  const isNewChunk = (await redis.sadd(chunkTrackKey(uploadId), String(chunkIndex))) === 1;

  const chunkData: ChunkInfo = {
    index: chunkIndex,
    size: chunkSize,
    path: storedPath,
    uploadedAt: new Date().toISOString(),
    ...(checksum ? { checksum } : {}),
  };

  // Add/update chunk info in sorted set (score = index for ordering)
  await redis.zadd(
    chunksKey(uploadId),
    chunkIndex,
    JSON.stringify(chunkData)
  );

  // Update meta counters ONLY if it's a new chunk
  if (isNewChunk) {
    const pipeline = redis.pipeline();
    pipeline.hincrby(metaKey(uploadId), 'receivedChunks', 1);
    pipeline.hincrby(metaKey(uploadId), 'totalSize', chunkSize);
    await pipeline.exec();
  }

  // Ensure status reflects active uploading
  const currentStatus = await redis.hget(sessionKey(uploadId), 'status');
  if (currentStatus === 'CREATED') {
    await redis.hset(sessionKey(uploadId), 'status', 'UPLOADING');
  }

  // Refresh TTL on all keys
  await redis.expire(chunksKey(uploadId), SESSION_TTL_SECONDS);
  await redis.expire(metaKey(uploadId), SESSION_TTL_SECONDS);
  await redis.expire(chunkTrackKey(uploadId), SESSION_TTL_SECONDS);
  await redis.expire(sessionKey(uploadId), SESSION_TTL_SECONDS);

  // Fetch current totals
  const meta = await redis.hgetall(metaKey(uploadId));
  const receivedChunks = parseInt(meta?.receivedChunks || '0', 10);
  const totalSize = parseInt(meta?.totalSize || '0', 10);

  return { receivedChunks, totalSize, isDuplicate: !isNewChunk };
}

/**
 * Get all chunks for an upload session, ordered by index.
 * Returns the parsed ChunkInfo objects.
 */
export async function getOrderedChunks(
  uploadId: string
): Promise<ChunkInfo[]> {
  const redis = assertRedis();

  const raw = await redis.zrange(chunksKey(uploadId), 0, -1);
  return raw.map((entry) => JSON.parse(entry) as ChunkInfo);
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

  // Check expiration
  if (data.expiresAt && new Date(data.expiresAt).getTime() <= Date.now()) {
    return {
      ...data,
      fileSize: parseInt(data.fileSize ?? '0', 10),
      totalChunks: parseInt(data.totalChunks ?? '0', 10),
      chunkSize: parseInt(data.chunkSize ?? '0', 10),
      status: 'EXPIRED',
    } as unknown as UploadSessionMeta;
  }

  // Parse back numeric fields
  return {
    ...data,
    fileSize: parseInt(data.fileSize ?? '0', 10),
    totalChunks: parseInt(data.totalChunks ?? '0', 10),
    chunkSize: parseInt(data.chunkSize ?? '0', 10),
    status: (data.status as UploadSessionStatus) || 'CREATED',
  } as unknown as UploadSessionMeta;
}

/**
 * Exhaustive check for chunk completion:
 * 1. Verifies that exactly indices [0 ... totalChunks - 1] exist with no missing gaps.
 * 2. Verifies that sum(chunk.size) matches declared fileSize.
 * 3. Verifies that every chunk has valid properties and checksum format if supplied.
 */
export async function validateUploadCompletion(
  uploadId: string
): Promise<CompletionValidationResult> {
  const session = await getSessionMeta(uploadId);
  if (!session) {
    return { valid: false, error: 'Session not found', chunks: [], totalSize: 0 };
  }

  if (session.status === 'EXPIRED') {
    return { valid: false, error: 'Upload session has expired', chunks: [], totalSize: 0 };
  }

  const chunks = await getOrderedChunks(uploadId);

  // 1. Verify total count matches declared totalChunks
  if (chunks.length !== session.totalChunks) {
    return {
      valid: false,
      error: `Chunk count mismatch: expected ${session.totalChunks}, received ${chunks.length}`,
      chunks,
      totalSize: 0,
    };
  }

  // 2. Verify exact indices [0 ... totalChunks - 1] without gaps or duplicates
  let calculatedSize = 0;
  for (let i = 0; i < session.totalChunks; i++) {
    const chunk = chunks[i];
    if (!chunk || chunk.index !== i) {
      return {
        valid: false,
        error: `Missing chunk at index ${i}`,
        chunks,
        totalSize: calculatedSize,
      };
    }

    // Validate checksum format if present (sha-256 64-character hex)
    if (chunk.checksum && !/^[a-f0-9]{64}$/i.test(chunk.checksum)) {
      return {
        valid: false,
        error: `Invalid checksum format for chunk ${i}`,
        chunks,
        totalSize: calculatedSize,
      };
    }

    calculatedSize += chunk.size;
  }

  // 3. Verify total size matches declared fileSize
  if (calculatedSize !== session.fileSize) {
    return {
      valid: false,
      error: `File size mismatch: declared ${session.fileSize} bytes, but received chunks sum to ${calculatedSize} bytes`,
      chunks,
      totalSize: calculatedSize,
    };
  }

  return {
    valid: true,
    chunks,
    totalSize: calculatedSize,
  };
}

/**
 * Check if all chunks have been received.
 * Requires all indices [0 ... totalChunks - 1] to be present.
 */
export async function isUploadComplete(uploadId: string): Promise<boolean> {
  const result = await validateUploadCompletion(uploadId);
  return result.valid;
}

/**
 * Get the total received size for the upload.
 */
export async function getUploadProgress(
  uploadId: string
): Promise<{ receivedChunks: number; totalChunks: number; totalSize: number; status: UploadSessionStatus } | null> {
  const redis = assertRedis();
  const session = await getSessionMeta(uploadId);
  if (!session) return null;

  const meta = await redis.hgetall(metaKey(uploadId));
  if (!meta) return null;

  return {
    receivedChunks: parseInt(meta.receivedChunks || '0', 10),
    totalChunks: session.totalChunks,
    totalSize: parseInt(meta.totalSize || '0', 10),
    status: session.status,
  };
}

/**
 * Mark the upload session as completed (status = 'COMPLETED').
 * This prevents reuse after the final assembly.
 */
export async function markUploadCompleted(uploadId: string): Promise<void> {
  await updateSessionStatus(uploadId, 'COMPLETED');
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
  pipeline.del(chunkTrackKey(uploadId));
  await pipeline.exec();
}
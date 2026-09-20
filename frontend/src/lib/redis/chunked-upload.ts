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

// ─── Input validation (trust boundary) ───────────────────────────────────
// Every public function in this module takes `uploadId` (and sometimes
// status names / counters) that will eventually arrive from HTTP callers.
// Redis keys are binary-safe, but an unconstrained id still causes damage:
// `{...}` hash-tags steer cluster slots, whitespace/newlines poison logs,
// and over-long ids bloat every key that embeds them. Constrain the shape
// once, here, so no caller can smuggle key-namespace syntax through.

const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const UPLOAD_STATUSES: readonly UploadSessionStatus[] = [
  'CREATED',
  'UPLOADING',
  'COMPLETING',
  'COMPLETED',
  'EXPIRED',
];

function assertValidUploadId(uploadId: string): void {
  if (!UPLOAD_ID_PATTERN.test(uploadId)) {
    throw new Error('Invalid uploadId: must match /^[A-Za-z0-9_-]{1,128}$/');
  }
}

function assertValidStatus(status: string): asserts status is UploadSessionStatus {
  if (!(UPLOAD_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Invalid upload status: ${JSON.stringify(status)}`);
  }
}

function assertNonNegativeInt(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid ${name}: must be a non-negative safe integer`);
  }
}

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
  assertValidUploadId(session.uploadId);
  if (session.status !== undefined) assertValidStatus(session.status);
  assertNonNegativeInt('fileSize', session.fileSize);
  assertNonNegativeInt('totalChunks', session.totalChunks);
  assertNonNegativeInt('chunkSize', session.chunkSize);
  if (session.totalChunks < 1) {
    throw new Error('Invalid totalChunks: must be at least 1');
  }
  if (session.chunkSize < 1) {
    throw new Error('Invalid chunkSize: must be at least 1');
  }
  // Structural invariant: the declared file size must fit in the declared
  // chunk grid (last chunk may be partial). A session violating this can
  // never validate at completion, so reject it at creation.
  if (
    session.fileSize > session.totalChunks * session.chunkSize ||
    session.fileSize <= (session.totalChunks - 1) * session.chunkSize
  ) {
    throw new Error('Invalid session: fileSize does not fit totalChunks * chunkSize');
  }
  if (session.fileName.length > 512 || session.folder.length > 512 || session.userId.length > 256) {
    throw new Error('Invalid session: fileName/folder/userId exceeds length limits');
  }
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
 *
 * NOTE: this is an unconditional write and is NOT safe to call from
 * finalize/complete paths where two concurrent requests must not be able to
 * both win the transition. Use {@link compareAndSetSessionStatus} for that.
 */
export async function updateSessionStatus(
  uploadId: string,
  status: UploadSessionStatus
): Promise<void> {
  assertValidUploadId(uploadId);
  assertValidStatus(status);
  const redis = assertRedis();
  await redis.hset(sessionKey(uploadId), 'status', status);
}

/**
 * Atomically transition an upload session's status from `from` to `to`,
 * returning 1 if the transition happened and 0 otherwise.
 *
 * Implemented as a Lua script so the read of the current status and the
 * write of the new status happen as a single Redis operation. Without this,
 * two concurrent finalize requests can both read status='UPLOADING' in
 * their GET handler, both call `updateSessionStatus('COMPLETING')`, both
 * run validation, and both proceed to mark the upload completed — a classic
 * lost-update / TOCTOU race that ends in double-assembly or, worse,
 * assembly against a partially-overwritten chunk set.
 *
 * Pass `null` for `from` to require only that the key exists (any current
 * status is accepted). This is the right form for `COMPLETING`:
 *
 *   compareAndSetSessionStatus(id, 'COMPLETING', null)
 *
 * is rejected once a previous winner already moved the session to
 * 'COMPLETING' or 'COMPLETED' — the second concurrent request cannot enter
 * the finalize window at all.
 */
const CAS_STATUS_SCRIPT = `
local key = KEYS[1]
local expected = ARGV[1]
local next_status = ARGV[2]
local current = redis.call('HGET', key, 'status')
if not current then
  return -1
end
if expected == '' or expected == nil then
  redis.call('HSET', key, 'status', next_status)
  return 1
end
if current ~= expected then
  return 0
end
redis.call('HSET', key, 'status', next_status)
return 1
`;

/**
 * Runs the CAS script through ioredis' purpose-built command API.
 *
 * SECURITY CONTRACT (Lua-injection ban): the ONLY Lua this module may ever
 * execute is the frozen `CAS_STATUS_SCRIPT` constant above. Untrusted input
 * (`uploadId`, statuses) travels exclusively via KEYS/ARGV — never string-
 * interpolated into script text. `defineCommand` additionally SHA-caches the
 * script (EVALSHA + NOSCRIPT retry handled by ioredis) instead of shipping
 * the body on every call. Any future script MUST follow the same shape:
 * module-level constant + data-only arguments, or it does not ship.
 */
type CasCommand = (key: string, expectedFrom: string, nextStatus: string) => Promise<number>;

function getCasCommand(redis: ReturnType<typeof assertRedis>): CasCommand {
  const client = redis as unknown as {
    casUploadStatus?: CasCommand;
    defineCommand?: (name: string, opts: { lua: string; numberOfKeys: number }) => void;
    eval?: (script: string, keyCount: number, ...args: string[]) => Promise<number>;
  };
  if (typeof client.casUploadStatus === 'function') {
    return client.casUploadStatus.bind(redis);
  }
  if (typeof client.defineCommand === 'function') {
    client.defineCommand('casUploadStatus', {
      lua: CAS_STATUS_SCRIPT,
      numberOfKeys: 1,
    });
    const defined = (redis as unknown as { casUploadStatus: CasCommand }).casUploadStatus;
    if (typeof defined === 'function') return defined.bind(redis);
  }
  // Minimal clients (tests, Redis shims without scripting commands): fall
  // back to EVAL with the SAME constant script — still no interpolation.
  if (typeof client.eval === 'function') {
    const evalFn = client.eval.bind(redis);
    return (key, expectedFrom, nextStatus) => evalFn(CAS_STATUS_SCRIPT, 1, key, expectedFrom, nextStatus);
  }
  throw new Error('Redis client supports neither defineCommand nor eval; cannot run CAS script');
}

export async function compareAndSetSessionStatus(
  uploadId: string,
  nextStatus: UploadSessionStatus,
  expectedFrom: UploadSessionStatus | null
): Promise<'ok' | 'stale' | 'missing'> {
  assertValidUploadId(uploadId);
  assertValidStatus(nextStatus);
  if (expectedFrom !== null) assertValidStatus(expectedFrom);
  const redis = assertRedis();
  const raw = await getCasCommand(redis)(
    sessionKey(uploadId),
    expectedFrom ?? '',
    nextStatus
  );

  if (raw === 1) return 'ok';
  if (raw === 0) return 'stale';
  return 'missing';
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
  assertValidUploadId(uploadId);
  assertNonNegativeInt('chunkIndex', chunkIndex);
  assertNonNegativeInt('chunkSize', chunkSize);
  if (chunkSize < 1) {
    throw new Error('Invalid chunkSize: must be at least 1');
  }
  if (storedPath.length === 0 || storedPath.length > 1024) {
    throw new Error('Invalid storedPath: must be 1..1024 characters');
  }
  if (checksum !== undefined && !/^[a-f0-9]{64}$/i.test(checksum)) {
    throw new Error('Invalid checksum: must be SHA-256 hex');
  }
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
  assertValidUploadId(uploadId);
  const redis = assertRedis();

  const raw = await redis.zrange(chunksKey(uploadId), 0, -1);
  const chunks: ChunkInfo[] = [];
  for (const entry of raw) {
    try {
      chunks.push(JSON.parse(entry) as ChunkInfo);
    } catch {
      // A corrupt zset member must not take down completion checks; the
      // count/index validation below will fail closed on the gap.
      continue;
    }
  }
  return chunks;
}

/**
 * Get the session metadata.
 */
export async function getSessionMeta(
  uploadId: string
): Promise<UploadSessionMeta | null> {
  assertValidUploadId(uploadId);
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
  assertValidUploadId(uploadId);
  const result = await validateUploadCompletion(uploadId);
  return result.valid;
}

/**
 * Get the total received size for the upload.
 */
export async function getUploadProgress(
  uploadId: string
): Promise<{ receivedChunks: number; totalChunks: number; totalSize: number; status: UploadSessionStatus } | null> {
  assertValidUploadId(uploadId);
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
 *
 * SECURITY: this transition is CAS-gated to 'COMPLETING' so that it can
 * only fire from inside the finalize handler that just won the
 * COMPLETING transition. A second concurrent finalize request that lost
 * the CAS for COMPLETING will not be able to call this — its CAS will
 * return 'stale' and the handler will return 409 to the caller instead
 * of double-marking the session.
 */
export async function markUploadCompleted(uploadId: string): Promise<'ok' | 'stale' | 'missing'> {
  return compareAndSetSessionStatus(uploadId, 'COMPLETED', 'COMPLETING');
}

/**
 * Delete all Redis keys associated with an upload session (cleanup).
 */
export async function cleanupUpload(uploadId: string): Promise<void> {
  assertValidUploadId(uploadId);
  const redis = assertRedis();
  const pipeline = redis.pipeline();
  pipeline.del(sessionKey(uploadId));
  pipeline.del(chunksKey(uploadId));
  pipeline.del(metaKey(uploadId));
  pipeline.del(chunkTrackKey(uploadId));
  await pipeline.exec();
}
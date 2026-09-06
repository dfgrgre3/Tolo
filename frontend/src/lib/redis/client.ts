import 'server-only';

if (typeof window !== 'undefined') {
  throw new Error('Redis client can only be used on the server side.');
}

import Redis from 'ioredis';
import * as Sentry from '@sentry/nextjs';

let redisClient: Redis | null = null;
/**
 * Connection promise shared across concurrent first-time callers.
 *
 * Without this, the very first request to reach Redis triggers the TCP
 * handshake. Every other request that arrives while the handshake is
 * in flight saw `isConnecting === true` and returned `null`, which the
 * callers treated as "Redis is unavailable" and rejected with 503. A
 * burst of N requests on a cold start produced N-1 spurious 503s.
 *
 * Storing the in-flight promise and `await`-ing it from every caller
 * makes the connection genuinely single-flight: all callers block on
 * the same handshake, all observe the same resulting client.
 */
let connectionPromise: Promise<Redis> | null = null;

const REDIS_URL = process.env.REDIS_URL || '';
const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true';

async function connect(): Promise<Redis> {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
    retryStrategy(times) {
      if (times > 3) {
        console.error('[Redis] Max retries reached. Giving up.');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    enableReadyCheck: true,
    lazyConnect: false,
  });

  // Surface connection errors so the shared promise rejects and the
  // caller's `await` propagates a real failure (rather than hanging or
  // silently treating Redis as down forever).
  const ready = new Promise<Redis>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve(client);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      client.off('ready', onReady);
      client.off('error', onError);
    };
    client.once('ready', onReady);
    client.once('error', onError);
  });

  client.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('close', () => {
    console.warn('[Redis] Connection closed');
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  redisClient = await ready;
  return redisClient;
}

/**
 * Get or create a Redis client singleton.
 * Uses the REDIS_URL from environment config.
 * Returns null if Redis is disabled or not configured.
 *
 * Synchronous callers (the existing API of this function) still get a
 * cached-or-null answer so they can fast-fail on misconfiguration.
 * Async callers should prefer {@link getRedisClientAsync} which awaits
 * the in-flight handshake instead of reporting Redis as down.
 */
export function getRedisClient(): Redis | null {
  if (DISABLE_REDIS || !REDIS_URL) {
    return null;
  }

  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  if (redisClient && (redisClient.status === 'connecting' || redisClient.status === 'connect')) {
    return redisClient;
  }

  // Don't kick off a new handshake from the sync API — that's exactly
  // what produced the original race. The async API below owns the
  // single-flight connection promise.
  return null;
}

/**
 * Async, single-flight variant of {@link getRedisClient}.
 *
 * The first concurrent caller opens the connection; every other caller
 * that arrives while the handshake is in flight awaits the same promise
 * and receives the same ready client. On failure the promise rejects,
 * the cache is reset, and the next caller can retry the connection.
 */
export async function getRedisClientAsync(): Promise<Redis | null> {
  if (DISABLE_REDIS || !REDIS_URL) {
    return null;
  }

  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  if (!connectionPromise) {
    connectionPromise = connect().catch((err) => {
      // Allow the next caller to retry instead of being permanently
      // stuck on the rejected promise.
      connectionPromise = null;
      redisClient = null;
      throw err;
    });
  }

  try {
    return await connectionPromise;
  } catch (error) {
    Sentry.captureException(error, { tags: { source: 'redis:connect' } });
    return null;
  }
}

/**
 * Gracefully close the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  connectionPromise = null;
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
  }
}
import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isConnecting = false;

const REDIS_URL = process.env.REDIS_URL || '';
const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true';

/**
 * Get or create a Redis client singleton.
 * Uses the REDIS_URL from environment config.
 * Returns null if Redis is disabled or not configured.
 */
export function getRedisClient(): Redis | null {
  if (DISABLE_REDIS || !REDIS_URL) {
    return null;
  }

  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  if (isConnecting) {
    return null;
  }

  try {
    isConnecting = true;

    redisClient = new Redis(REDIS_URL, {
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

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
      isConnecting = false;
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      isConnecting = false;
    });

    redisClient.on('close', () => {
      console.warn('[Redis] Connection closed');
      isConnecting = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to create client:', error);
    isConnecting = false;
    return null;
  }
}

/**
 * Gracefully close the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
    isConnecting = false;
  }
}
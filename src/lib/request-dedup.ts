import { getRedisClient } from '@/lib/cache';
import { logger } from '@/lib/logger';

/**
 * Request Deduplication / Idempotency Service
 * 
 * Prevents double-processing of critical operations (payments, enrollments)
 * when users click multiple times or when network retries occur.
 *
 * Uses Redis SETNX (Set if Not eXists) for atomic, distributed locking.
 * If Redis is unavailable, falls back to in-memory Map (per-instance).
 */

const DEDUP_TTL = 300; // 5 minutes, enough for operation to complete
const localDedup = new Map<string, { timestamp: number; status: string }>();
const MAX_LOCAL_ENTRIES = 10_000;

export interface DedupResult {
  isDuplicate: boolean;
  existingStatus?: string;
}

export class RequestDeduplication {
  /**
   * Try to acquire an idempotency lock for a given key.
   * @returns isDuplicate=true if the key already exists (request is a duplicate)
   */
  static async acquire(key: string): Promise<DedupResult> {
    const fullKey = `dedup:${key}`;

    try {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        // Atomic SETNX: only sets if key doesn't exist
        const result = await client.set(fullKey, 'PROCESSING', 'EX', DEDUP_TTL, 'NX');

        if (result === 'OK') {
          logger.debug(`[Dedup] Lock acquired for key: ${key}`);
          return { isDuplicate: false };
        }

        // Key exists - this is a duplicate request
        const existingStatus = await client.get(fullKey);
        logger.warn(`[Dedup] Duplicate request detected for key: ${key}. Status: ${existingStatus}`);
        return { isDuplicate: true, existingStatus: existingStatus || 'PROCESSING' };
      } else {
        logger.warn(`[Dedup] Redis NOT ready. Using local fallback for key: ${key}. Status: ${client?.status}`);
      }
    } catch (error) {
      logger.error(`[Dedup] Redis error for key ${key}:`, error);
    }

    // Fallback: local memory dedup
    return this.localAcquire(fullKey);
  }

  /**
   * Mark the operation as completed (update the dedup entry status)
   */
  static async complete(key: string, status: string = 'COMPLETED'): Promise<void> {
    const fullKey = `dedup:${key}`;

    try {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        // Update status but keep the TTL to prevent re-processing within the window
        await client.set(fullKey, status, 'EX', DEDUP_TTL);
        return;
      }
    } catch (error) {
      logger.error(`[Dedup] Error completing key ${key}:`, error);
    }

    // Local fallback
    const entry = localDedup.get(fullKey);
    if (entry) {
      entry.status = status;
    }
  }

  /**
   * Release a dedup lock (e.g., if the operation failed and should be retryable)
   */
  static async release(key: string): Promise<void> {
    const fullKey = `dedup:${key}`;

    try {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        await client.del(fullKey);
        return;
      }
    } catch (error) {
      logger.error(`[Dedup] Error releasing key ${key}:`, error);
    }

    localDedup.delete(fullKey);
  }

  /**
   * Generate a standard idempotency key for checkout operations
   */
  static checkoutKey(userId: string, courseId: string): string {
    return `checkout:${userId}:${courseId}`;
  }

  /**
   * Generate a standard idempotency key for payment operations
   */
  static paymentKey(userId: string, amount: number, method: string): string {
    return `payment:${userId}:${amount}:${method}`;
  }

  // --- Local Memory Fallback ---

  private static localAcquire(key: string): DedupResult {
    const now = Date.now();

      // Cleanup expired entries periodically
      if (localDedup.size >= MAX_LOCAL_ENTRIES) {
        const keysToDelete: string[] = [];
        localDedup.forEach((v, k) => {
          if (now - v.timestamp > DEDUP_TTL * 1000) {
            keysToDelete.push(k);
          }
        });
        keysToDelete.forEach(k => localDedup.delete(k));
      }

    const existing = localDedup.get(key);
    if (existing && now - existing.timestamp < DEDUP_TTL * 1000) {
      return { isDuplicate: true, existingStatus: existing.status };
    }

    localDedup.set(key, { timestamp: now, status: 'PROCESSING' });
    return { isDuplicate: false };
  }
}

export default RequestDeduplication;

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { CacheService } from '@/lib/cache';

/**
 * Database Health Monitor
 * 
 * Proactively monitors PostgreSQL connection pool health to detect
 * exhaustion before it causes user-facing errors.
 * 
 * Metrics tracked:
 * - Connection pool utilization
 * - Query latency (P50, P95, P99)
 * - Active vs idle connections
 * - Replication lag (for read replicas)
 */

export interface DbHealthStatus {
  healthy: boolean;
  latencyMs: number;
  poolUtilization: number;
  activeConnections: number;
  maxConnections: number;
  replicationLagMs?: number;
  timestamp: number;
}

// Ring buffer for latency tracking
const latencySamples: number[] = [];
const MAX_SAMPLES = 100;

export class DatabaseHealthMonitor {
  private static checkInterval: ReturnType<typeof setInterval> | null = null;
  private static lastHealth: DbHealthStatus | null = null;
  private static startedAt: number = 0;
  /** Grace period after startup to avoid false positives from cold connection pools */
  private static STARTUP_GRACE_MS = 60_000;

  /**
   * Start periodic health monitoring
   */
  private static isChecking = false;

  /**
   * Start periodic health monitoring
   */
  static start(intervalMs: number = 30_000): void {
    if (this.checkInterval) return;
    this.startedAt = Date.now();

    this.checkInterval = setInterval(async () => {
      if (this.isChecking) return;
      this.isChecking = true;

      try {
        const health = await this.check();
        this.lastHealth = health;

        // Cache the health status for the /api/healthz endpoint
        await CacheService.set('system:db_health', health, 60);

        const inGracePeriod = Date.now() - this.startedAt < this.STARTUP_GRACE_MS;

        // Alert on degraded health (skip alerts during startup grace period)
        if (!health.healthy) {
          if (inGracePeriod) {
            logger.info(`[DBHealth] Startup warmup — latency ${health.latencyMs}ms (grace period, not alerting)`);
          } else {
            logger.error(`[DBHealth] Database health degraded: ${JSON.stringify(health)}`);
            if (health.latencyMs > 1000 && process.env.NODE_ENV === 'development') {
              logger.warn('[DBHealth] High latency detected in development. Ensure .env uses 127.0.0.1 instead of localhost.');
            }
          }
        } else if (health.poolUtilization > 0.8) {
          logger.warn(`[DBHealth] Pool utilization high: ${(health.poolUtilization * 100).toFixed(1)}%`);
        } else if (health.latencyMs > 300 && !inGracePeriod) {
          logger.warn(`[DBHealth] Query latency elevated: ${health.latencyMs}ms`);
        }
      } catch (error: any) {
        logger.error('[DBHealth] Health check failed:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          stack: error?.stack
        });
      } finally {
        this.isChecking = false;
      }
    }, intervalMs);

    // Don't prevent process from exiting
    if (this.checkInterval.unref) this.checkInterval.unref();

    logger.info(`[DBHealth] Monitor started (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop monitoring
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get last cached health status (fast, no DB query)
   */
  static getLastHealth(): DbHealthStatus | null {
    return this.lastHealth;
  }

  /**
   * Run a full health check against the database
   */
  static async check(): Promise<DbHealthStatus> {
    const start = Date.now();

    try {
      // 1. Basic connectivity + latency check
      const pingResult = await prisma.$queryRaw<[{ now: Date }]>`SELECT NOW() as now`;
      const latencyMs = Date.now() - start;

      // Track latency sample
      latencySamples.push(latencyMs);
      if (latencySamples.length > MAX_SAMPLES) {
        latencySamples.shift();
      }

      // 2. Connection pool stats from PostgreSQL
      let activeConnections = 0;
      let maxConnections = 100;

      try {
        const poolStats = await prisma.$queryRaw<any[]>`
          SELECT 
            count(*) FILTER (WHERE state = 'active') as active,
            count(*) FILTER (WHERE state = 'idle') as idle,
            count(*) as total,
            (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_conn
          FROM pg_stat_activity
          WHERE datname = current_database()
        `;

        if (poolStats[0]) {
          activeConnections = Number(poolStats[0].active || 0);
          maxConnections = Number(poolStats[0].max_conn || 100);
        }
      } catch {
        // Non-critical: pg_stat_activity might be restricted
      }

      const poolUtilization = maxConnections > 0 ? activeConnections / maxConnections : 0;

      // 3. Check replication lag (if replica is configured)
      let replicationLagMs: number | undefined;
      if (process.env.DATABASE_URL_REPLICA) {
        try {
          const replicationInfo = await prisma.$queryRaw<any[]>`
            SELECT 
              CASE 
                WHEN pg_last_wal_receive_lsn() IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000
                ELSE NULL 
              END as lag_ms
          `;
          if (replicationInfo[0]?.lag_ms != null) {
            replicationLagMs = Number(replicationInfo[0].lag_ms);
          }
        } catch {
          // Replication info might not be available on primary
        }
      }

      // Determine overall health
      const healthy = latencyMs < 2000 && poolUtilization < 0.9;

      return {
        healthy,
        latencyMs,
        poolUtilization,
        activeConnections,
        maxConnections,
        replicationLagMs,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        poolUtilization: 1,
        activeConnections: 0,
        maxConnections: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get latency percentiles from recent samples
   */
  static getLatencyPercentiles(): { p50: number; p95: number; p99: number } {
    if (latencySamples.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...latencySamples].sort((a, b) => a - b);
    const p = (percentile: number) => {
      const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    return {
      p50: p(50),
      p95: p(95),
      p99: p(99),
    };
  }
}

export default DatabaseHealthMonitor;

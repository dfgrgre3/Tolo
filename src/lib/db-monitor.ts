/**
 * Database Connection Monitor
 * 
 * Monitors PostgreSQL connection pool health and provides
 * real-time metrics for observability and alerting.
 */

import { prisma } from './db';
import { logger } from './logger';
import { setDbConnections } from './metrics/prometheus';

export interface DbPoolStats {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingCount: number;
    utilizationPercent: number;
    maxConnections: number;
    status: 'healthy' | 'warning' | 'critical';
}

interface RawStatEntry {
  total: bigint | number;
  active: bigint | number;
  idle: bigint | number;
  idle_in_transaction: bigint | number;
  aborted: bigint | number;
  waiting: bigint | number;
}

/**
 * Get database connection pool statistics from PostgreSQL
 */
export async function getDbPoolStats(): Promise<DbPoolStats> {
    const maxConnections = parseInt(process.env.PRISMA_CONNECTION_LIMIT || '50', 10);

    try {
        const result = await prisma.$queryRaw<RawStatEntry[]>`
          SELECT 
            COUNT(*)::int as total,
            COUNT(CASE WHEN state = 'active' THEN 1 END)::int as active,
            COUNT(CASE WHEN state = 'idle' THEN 1 END)::int as idle,
            COUNT(CASE WHEN state = 'idle in transaction' THEN 1 END)::int as idle_in_transaction,
            COUNT(CASE WHEN state = 'idle in transaction (aborted)' THEN 1 END)::int as aborted,
            COUNT(CASE WHEN wait_event_type IS NOT NULL THEN 1 END)::int as waiting
          FROM pg_stat_activity
          WHERE datname = current_database()
        `;

        if (!result || result.length === 0) throw new Error('Empty stats result');

        const stats = result[0];
        const total = Number(stats.total || 0);
        const active = Number(stats.active || 0);
        const idle = Number(stats.idle || 0);
        const waiting = Number(stats.waiting || 0);

        const utilizationPercent = Math.round((total / maxConnections) * 100);

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (utilizationPercent >= 85) {
            status = 'critical';
        } else if (utilizationPercent >= 60) {
            status = 'warning';
        }

        const poolStats: DbPoolStats = {
            totalConnections: total,
            activeConnections: active,
            idleConnections: idle,
            waitingCount: waiting,
            utilizationPercent,
            maxConnections,
            status,
        };

        setDbConnections(active);
        return poolStats;
    } catch (error) {
        logger.error('[DbMonitor] Failed to get pool stats:', error);

        return {
            totalConnections: 0,
            activeConnections: 0,
            idleConnections: 0,
            waitingCount: 0,
            utilizationPercent: 0,
            maxConnections,
            status: 'warning',
        };
    }
}

export async function isDbPoolHealthy(): Promise<boolean> {
    const stats = await getDbPoolStats();
    return stats.status !== 'critical';
}

export async function checkDbReadiness(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        const stats = await getDbPoolStats();
        return stats.utilizationPercent < 90;
    } catch {
        return false;
    }
}

let monitoringInterval: ReturnType<typeof setInterval> | null = null;

export function startPoolMonitoring(intervalMs: number = 30000): void {
    if (monitoringInterval) return;

    monitoringInterval = setInterval(async () => {
        try {
            const stats = await getDbPoolStats();
            logger.info(`[DbMonitor] Pool Stats: ${stats.activeConnections}/${stats.maxConnections} active (${stats.utilizationPercent}%) - Status: ${stats.status}`);

            if (stats.status === 'critical') {
                logger.warn(`[DbMonitor] CRITICAL: Connection pool near exhaustion!`, stats);
            }
        } catch (error) {
            logger.error('[DbMonitor] Monitoring error:', error);
        }
    }, intervalMs);

    monitoringInterval.unref();
}

export function stopPoolMonitoring(): void {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
}

export const dbMonitor = {
    getStats: getDbPoolStats,
    isHealthy: isDbPoolHealthy,
    checkReadiness: checkDbReadiness,
    start: startPoolMonitoring,
    stop: stopPoolMonitoring,
};


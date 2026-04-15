/**
 * Infrastructure Stats API Endpoint
 * 
 * Provides real-time system metrics for monitoring dashboards
 * and alerting systems.
 * 
 * GET /api/admin/infrastructure/stats
 * 
 * Returns:
 * - Database connection pool stats
 * - Memory usage
 * - Queue health
 * - Cache hit rates
 * - Circuit breaker states
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbPoolStats } from '@/lib/db-monitor';
import { logger } from '@/lib/logger';
import { getMetrics } from '@/lib/metrics/prometheus';
import { successResponse, handleApiError } from '@/lib/api-utils';
import { getRedisClient } from '@/lib/cache';
import { gamificationQueue, notificationQueue, analyticsQueue } from '@/lib/queue/bullmq';

// Only allow admin access
async function isAdmin(request: NextRequest): Promise<boolean> {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN';
}

async function getQueueStats(queue: any) {
  try {
    const internal = queue.getInternalQueue();
    const [active, waiting, failed, completed] = await Promise.all([
      internal.getActiveCount(),
      internal.getWaitingCount(),
      internal.getFailedCount(),
      internal.getCompletedCount(),
    ]);
    return { active, waiting, failed, completed };
  } catch (error) {
    logger.error(`[InfrastructureStats] Failed to get stats for queue:`, error);
    return { active: 0, waiting: 0, failed: 0, completed: 0 };
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Gather all metrics in parallel
    const [dbStatsResult, metricsResult, redisClient] = await Promise.all([
      getDbPoolStats(),
      getMetrics().catch(() => 'unavailable'),
      getRedisClient(),
    ]);

    const dbStats = dbStatsResult;
    
    // Get Queue stats
    const [gamificationStats, notificationStats, analyticsStats] = await Promise.all([
      getQueueStats(gamificationQueue),
      getQueueStats(notificationQueue),
      getQueueStats(analyticsQueue),
    ]);

    // Get Redis memory info
    let redisMemory = '0B';
    if (redisClient) {
      try {
        const info = await redisClient.info('memory');
        const match = info.match(/used_memory_human:([^\r\n]+)/);
        if (match) redisMemory = match[1];
      } catch (e) {
        logger.error('[InfrastructureStats] Redis info error:', e);
      }
    }

    const mem = process.memoryUsage();
    const memoryFormatted = `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`;

    const response: InfrastructureStatsResponse = {
      timestamp: new Date().toISOString(),
      database: dbStats,
      databaseError: dbStats.status === 'warning' && dbStats.totalConnections === 0 ? 'Connection failure' : null,
      metrics: metricsResult === 'unavailable' ? 'unavailable' : 'available',
      system: {
        nodeEnv: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: memoryFormatted,
        uptime: process.uptime(),
        pid: process.pid,
        status: dbStats.status === 'healthy' ? 'Operational' : (dbStats.status === 'warning' ? 'Degraded' : 'Critical'),
      },
      cache: {
        usedMemory: redisMemory,
      },
      queues: {
        gamification: gamificationStats,
        notifications: notificationStats,
        analytics: analyticsStats,
      },
      config: {
        maxOldSpaceSize: process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1] || 'unknown',
        prismaConnectionLimit: process.env.PRISMA_CONNECTION_LIMIT || '50',
        prismaPoolTimeout: process.env.PRISMA_POOL_TIMEOUT || '10',
        prismaPgbouncer: process.env.PRISMA_PGBOUNCER === 'true',
        redisEnabled: process.env.DISABLE_REDIS !== 'true',
      },
    };

    return successResponse(response);
  } catch (error) {
    logger.error('[InfrastructureStats] Error:', error);
    return handleApiError(error);
  }
}

interface InfrastructureStatsResponse {
  timestamp: string;
  database: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingCount: number;
    utilizationPercent: number;
    maxConnections: number;
    status: 'healthy' | 'warning' | 'critical';
  } | null;
  databaseError: string | null;
  metrics: string;
  system: {
    nodeEnv: string;
    nodeVersion: string;
    memoryUsage: string;
    uptime: number;
    pid: number;
    status: string;
  };
  cache: {
    usedMemory: string;
  };
  queues: {
    gamification: QueueStats;
    notifications: QueueStats;
    analytics: QueueStats;
  };
  config: {
    maxOldSpaceSize: string;
    prismaConnectionLimit: string;
    prismaPoolTimeout: string;
    prismaPgbouncer: boolean;
    redisEnabled: boolean;
  };
}

interface QueueStats {
  active: number;
  waiting: number;
  failed: number;
  completed: number;
}

// Health check endpoint (public)
export async function HEAD(request: NextRequest) {
  try {
    const { checkDbReadiness } = await import('@/lib/db-monitor');
    const dbReady = await checkDbReadiness();

    if (!dbReady) {
      return new NextResponse(null, { status: 503 });
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';



/**
 * GET /api/healthz
 * 
 * Health check endpoint for Kubernetes liveness probe.
 * Enhanced with DB health telemetry and graceful shutdown awareness.
 * 
 * Returns 503 during graceful shutdown so K8s stops routing traffic.
 */
export async function GET(_request: NextRequest) {
  try {
    // Check if we're shutting down
    let shuttingDown = false;
    try {
      const { getIsShuttingDown } = await import('@/lib/graceful-shutdown');
      shuttingDown = getIsShuttingDown();
    } catch {}

    if (shuttingDown) {
      return NextResponse.json(
        { status: 'shutting_down', timestamp: new Date().toISOString() },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Get DB health from the monitor (cached, no extra DB query)
    let dbHealth = null;
    try {
      const { DatabaseHealthMonitor } = await import('@/lib/db-health');
      dbHealth = DatabaseHealthMonitor.getLastHealth();
    } catch {}

    // Get circuit breaker states
    let circuitStates = {};
    try {
      const { dbCircuitBreaker, redisCircuitBreaker } = await import('@/lib/circuit-breaker');
      circuitStates = {
        database: dbCircuitBreaker.getState(),
        redis: redisCircuitBreaker.getState()
      };
    } catch {}

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      circuits: circuitStates,
      db: dbHealth ? {
        healthy: dbHealth.healthy,
        latencyMs: dbHealth.latencyMs,
        poolUtilization: `${(dbHealth.poolUtilization * 100).toFixed(1)}%`
      } : null
    };

    return NextResponse.json(health, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error) {
    logger.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 503 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
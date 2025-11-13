import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import redisService from '@/lib/redis';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

import 'server-only';

/**
 * GET /api/readyz
 * 
 * Readiness check endpoint للـ Kubernetes readiness probe
 * يتحقق من أن التطبيق جاهز لتلقي الطلبات
 * 
 * هذا endpoint يتحقق من الاتصال بقاعدة البيانات و Redis
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    // فحص قاعدة البيانات
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (dbError) {
      logger.error('Database readiness check failed:', dbError);
      checks.database = false;
    }

    // فحص Redis
    try {
      const client = redisService.getClient();
      if (client && typeof client.ping === 'function') {
        await client.ping();
      } else if (redisService.isConnected()) {
        // إذا كان client متصل، نعتبره جاهز
        checks.redis = true;
      } else {
        checks.redis = false;
      }
    } catch (redisError) {
      logger.error('Redis readiness check failed:', redisError);
      checks.redis = false;
    }

    const isReady = checks.database && checks.redis;

    if (isReady) {
      return NextResponse.json(
        {
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    } else {
      return NextResponse.json(
        {
          status: 'not ready',
          timestamp: new Date().toISOString(),
          checks,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    return NextResponse.json(
      {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks,
        error: 'Readiness check failed',
      },
      { status: 503 }
    );
    }
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

import 'server-only';

/**
 * GET /api/healthz
 * 
 * Health check endpoint للـ Kubernetes liveness probe
 * يتحقق من أن التطبيق يعمل بشكل صحيح
 * 
 * هذا endpoint يجب أن يكون سريعاً ولا يعتمد على خدمات خارجية معقدة
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
  try {
    // فحص بسيط للتأكد من أن التطبيق يعمل
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
    }
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;


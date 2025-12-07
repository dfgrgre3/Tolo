import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

import 'server-only';

/**
 * GET /api/healthz
 * 
 * Health check endpoint ظ„ظ„ظ€ Kubernetes liveness probe
 * ظٹطھط­ظ‚ظ‚ ظ…ظ† ط£ظ† ط§ظ„طھط·ط¨ظٹظ‚ ظٹط¹ظ…ظ„ ط¨ط´ظƒظ„ طµط­ظٹط­
 * 
 * ظ‡ط°ط§ endpoint ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط³ط±ظٹط¹ط§ظ‹ ظˆظ„ط§ ظٹط¹طھظ…ط¯ ط¹ظ„ظ‰ ط®ط¯ظ…ط§طھ ط®ط§ط±ط¬ظٹط© ظ…ط¹ظ‚ط¯ط©
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
  try {
    // ظپط­طµ ط¨ط³ظٹط· ظ„ظ„طھط£ظƒط¯ ظ…ظ† ط£ظ† ط§ظ„طھط·ط¨ظٹظ‚ ظٹط¹ظ…ظ„
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


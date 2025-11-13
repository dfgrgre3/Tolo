import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/metrics/prometheus';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

import 'server-only';

/**
 * GET /api/metrics
 * 
 * تصدير المقاييس بصيغة Prometheus exposition format
 * هذا endpoint يستخدمه Prometheus لجمع المقاييس
 * 
 * في Kubernetes، يجب أن يكون هذا endpoint متاحاً على المسار /metrics
 * كما هو محدد في k8s/monitoring.yml
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
  try {
    const metrics = await getMetrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Error generating metrics:', error);
    
    // في حالة الخطأ، نعيد استجابة فارغة بدلاً من خطأ
    // لأن Prometheus قد يحاول الوصول إلى هذا endpoint بشكل متكرر
    return new NextResponse('# Error generating metrics\n', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    }
  });
}

// منع التخزين المؤقت لهذا endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;


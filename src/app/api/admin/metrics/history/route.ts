import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/metrics/performance';

/**
 * API to fetch historical metrics for charts
 */
export async function GET() {
  // In a real production app, this would query Elasticsearch or a Time-series DB
  // For now, we return the in-memory metrics collected by the performanceMonitor
  
  const metrics = performanceMonitor.getRecentMetrics(50);
  const stats = performanceMonitor.getStats();

  return NextResponse.json({
    success: true,
    data: {
      metrics,
      stats
    }
  });
}

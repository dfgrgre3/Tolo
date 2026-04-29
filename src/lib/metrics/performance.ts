/**
 * Performance Monitoring System
 * نظام مراقبة الأداء
 * 
 * Provides utilities for high-resolution timing and metric collection
 */

import { logger } from '../logger';

// Check if we're on the server
const isServer = typeof window === 'undefined';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'percent' | 'count';
  timestamp: string;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  /**
   * Start a timer for a specific operation
   */
  startTimer(name: string, tags?: Record<string, string>) {
    if (isServer) {
      const startTime = process.hrtime.bigint();
      return {
        stop: () => {
          const endTime = process.hrtime.bigint();
          const durationNs = endTime - startTime;
          const durationMs = Number(durationNs) / 1_000_000;
          
          this.recordMetric({
            name,
            value: durationMs,
            unit: 'ms',
            timestamp: new Date().toISOString(),
            tags
          });
          
          return durationMs;
        }
      };
    } else {
      const startTime = performance.now();
      return {
        stop: () => {
          const endTime = performance.now();
          const durationMs = endTime - startTime;
          
          this.recordMetric({
            name,
            value: durationMs,
            unit: 'ms',
            timestamp: new Date().toISOString(),
            tags
          });
          
          return durationMs;
        }
      };
    }
  }

  /**
   * Record a single metric
   */
  recordMetric(metric: PerformanceMetric) {
    // Log important metrics to ELK/Console
    if (metric.value > 500 && metric.unit === 'ms') {
      logger.warn(`Slow Performance detected: ${metric.name}`, {
        duration: `${metric.value.toFixed(2)}ms`,
        ...metric.tags
      });
    }

    // Store in-memory for local dashboard
    this.metrics.push(metric);
    
    // Maintain size limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // In production, we would also push to Prometheus/Datadog here
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count = 100) {
    return this.metrics.slice(-count);
  }

  /**
   * Get aggregated stats
   */
  getStats() {
    const now = new Date();
    const lastMinute = new Date(now.getTime() - 60000).toISOString();
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= lastMinute);
    
    const stats: Record<string, { avg: number, max: number, count: number }> = {};
    
    recentMetrics.forEach(m => {
      if (!stats[m.name]) {
        stats[m.name] = { avg: 0, max: 0, count: 0 };
      }
      
      const s = stats[m.name];
      s.count++;
      s.max = Math.max(s.max, m.value);
      s.avg = (s.avg * (s.count - 1) + m.value) / s.count;
    });
    
    return stats;
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware wrapper for measuring API response time
 */
export async function measureResponseTime<T>(
  name: string, 
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  if (!isServer) return operation();
  
  const timer = performanceMonitor.startTimer(name, tags);
  try {
    const result = await operation();
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    throw error;
  }
}

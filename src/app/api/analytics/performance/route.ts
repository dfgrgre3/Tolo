import { NextRequest, NextResponse } from 'next/server';
import redisClient, { CacheService } from '@/lib/redis';

// In-memory store for performance metrics if Redis is not available
const performanceMetrics: Record<string, number[]> = {};

/**
 * Get performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    
    // Try to get metrics from Redis first
    let metrics: Record<string, number[]> = {};
    
    try {
      // Try to get from Redis
      const cachedMetrics = await CacheService.get<Record<string, number[]>>('perf:metrics');
      if (cachedMetrics) {
        metrics = cachedMetrics;
      }
    } catch (error) {
      console.warn('Could not connect to Redis for performance metrics:', error);
      // Fallback to in-memory store
      metrics = performanceMetrics;
    }
    
    // Process metrics for the requested time period
    const now = Date.now();
    const timeThreshold = now - (hours * 60 * 60 * 1000);
    
    const processedMetrics: Record<string, { 
      count: number; 
      avg: number; 
      min: number; 
      max: number;
      trend: 'up' | 'down' | 'stable';
    }> = {};
    
    Object.keys(metrics).forEach(key => {
      const values = metrics[key].filter(timestamp => timestamp > timeThreshold);
      
      if (values.length > 0) {
        const count = values.length;
        const avg = values.reduce((a, b) => a + b, 0) / count;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // Calculate trend (comparing first half vs second half)
        const midpoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midpoint);
        const secondHalf = values.slice(midpoint);
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (firstHalf.length > 0 && secondHalf.length > 0) {
          const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          
          if (secondAvg > firstAvg * 1.1) {
            trend = 'up';
          } else if (secondAvg < firstAvg * 0.9) {
            trend = 'down';
          }
        }
        
        processedMetrics[key] = {
          count,
          avg,
          min,
          max,
          trend
        };
      }
    });
    
    return NextResponse.json({
      metrics: processedMetrics,
      period: `${hours} hours`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * Record a performance metric
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metric, value } = body;
    
    if (!metric || value === undefined) {
      return NextResponse.json(
        { error: 'Metric name and value are required' },
        { status: 400 }
      );
    }
    
    const timestamp = Date.now();
    
    try {
      // Try to store in Redis
      const existingMetrics = await CacheService.get<Record<string, number[]>>('perf:metrics') || {};
      
      if (!existingMetrics[metric]) {
        existingMetrics[metric] = [];
      }
      
      existingMetrics[metric].push(value);
      
      // Keep only last 1000 values per metric to prevent memory issues
      if (existingMetrics[metric].length > 1000) {
        existingMetrics[metric] = existingMetrics[metric].slice(-1000);
      }
      
      await CacheService.set('perf:metrics', existingMetrics, 86400); // Cache for 24 hours
    } catch (error) {
      console.warn('Could not store metrics in Redis, using in-memory store:', error);
      // Fallback to in-memory store
      if (!performanceMetrics[metric]) {
        performanceMetrics[metric] = [];
      }
      
      performanceMetrics[metric].push(value);
      
      // Keep only last 1000 values per metric
      if (performanceMetrics[metric].length > 1000) {
        performanceMetrics[metric] = performanceMetrics[metric].slice(-1000);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording performance metric:', error);
    return NextResponse.json(
      { error: 'Failed to record performance metric' },
      { status: 500 }
    );
  }
}
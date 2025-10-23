import { prisma, enhancedPrisma } from './db';
import redisClient, { CacheService } from './redis';
import { ConnectionPoolStats, defaultPoolStats, getDatabaseConfig } from './db';

// Query performance tracking
interface QueryPerformance {
  query: string;
  model: string;
  action: string;
  duration: number;
  timestamp: Date;
}

// Store for query performance metrics
const queryPerformanceStore: QueryPerformance[] = [];

// Cache performance tracking
interface CachePerformance {
  operation: string;
  duration: number;
  hit: boolean;
  timestamp: Date;
}

// Store for cache performance metrics
const cachePerformanceStore: CachePerformance[] = [];

// Maximum number of performance records to keep
const MAX_QUERY_RECORDS = 1000;
const MAX_CACHE_RECORDS = 1000;

/**
 * Database monitoring service
 */
export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private slowQueryThreshold: number;
  
  private constructor(slowQueryThreshold: number = getDatabaseConfig().slowQueryThreshold || 1000) {
    this.slowQueryThreshold = slowQueryThreshold;
    
    // Set up middleware for query monitoring
    this.setupQueryMonitoring();
  }
  
  /**
   * Get the singleton instance of DatabaseMonitor
   */
  public static getInstance(slowQueryThreshold?: number): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor(slowQueryThreshold);
    }
    
    return DatabaseMonitor.instance;
  }
  
  /**
   * Set up Prisma middleware for query monitoring
   */
  private setupQueryMonitoring(): void {
    prisma.$use(async (params, next) => {
      const before = Date.now();
      
      try {
        const result = await next(params);
        
        const after = Date.now();
        const duration = after - before;
        
        // Store query performance data
        this.recordQueryPerformance({
          query: `${params.model}.${params.action}`,
          model: params.model || 'unknown',
          action: params.action,
          duration,
          timestamp: new Date(),
        });
        
        // Log slow queries
        if (duration > this.slowQueryThreshold) {
          console.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        const after = Date.now();
        const duration = after - before;
        
        console.error(`Error in query ${params.model}.${params.action} after ${duration}ms:`, error);
        
        // Re-throw the error so it can be handled by the calling function
        throw error;
      }
    });
  }
  
  /**
   * Record query performance metrics
   */
  private recordQueryPerformance(performance: QueryPerformance): void {
    queryPerformanceStore.push(performance);
    
    // Keep only the most recent records
    if (queryPerformanceStore.length > MAX_QUERY_RECORDS) {
      queryPerformanceStore.shift();
    }
  }
  
  /**
   * Get current connection pool statistics
   * Note: This is a simplified implementation. In a real production environment
   * with actual connection pooling (e.g., PostgreSQL), this would connect to the
   * database's monitoring APIs.
   */
  public getConnectionPoolStats(): ConnectionPoolStats {
    // For SQLite, we return default stats since it doesn't have a real connection pool
    // But we can get enhanced stats from our enhancedPrisma instance
    return enhancedPrisma.getConnectionPoolStats();
  }
  
  /**
   * Optimize connection pool by closing idle connections
   */
  public optimizeConnectionPool(): void {
    enhancedPrisma.optimizeConnectionPool();
  }
  
  /**
   * Record cache performance metrics
   */
  public recordCachePerformance(operation: string, duration: number, hit: boolean): void {
    cachePerformanceStore.push({
      operation,
      duration,
      hit,
      timestamp: new Date(),
    });

    // Keep only the most recent records
    if (cachePerformanceStore.length > MAX_CACHE_RECORDS) {
      cachePerformanceStore.shift();
    }
  }

  /**
   * Get cache performance statistics
   */
  public getCachePerformanceStats(): {
    totalOperations: number;
    hits: number;
    misses: number;
    hitRate: number;
    averageDuration: number;
  } {
    const totalOperations = cachePerformanceStore.length;
    
    if (totalOperations === 0) {
      return {
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageDuration: 0,
      };
    }
    
    const hits = cachePerformanceStore.filter(op => op.hit).length;
    const misses = totalOperations - hits;
    const hitRate = (hits / totalOperations) * 100;
    
    const averageDuration = cachePerformanceStore.reduce(
      (sum, op) => sum + op.duration,
      0
    ) / totalOperations;
    
    return {
      totalOperations,
      hits,
      misses,
      hitRate,
      averageDuration,
    };
  }

  /**
   * Get slow query statistics
   */
  public getSlowQueryStats(durationThreshold: number = this.slowQueryThreshold): {
    totalQueries: number;
    slowQueries: number;
    slowQueryPercentage: number;
    averageQueryDuration: number;
    medianQueryDuration: number;
  } {
    const totalQueries = queryPerformanceStore.length;
    
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        slowQueryPercentage: 0,
        averageQueryDuration: 0,
        medianQueryDuration: 0,
      };
    }
    
    const slowQueries = queryPerformanceStore.filter(
      q => q.duration > durationThreshold
    ).length;
    
    const slowQueryPercentage = (slowQueries / totalQueries) * 100;
    
    const totalDuration = queryPerformanceStore.reduce(
      (sum, q) => sum + q.duration, 0
    );
    
    const averageQueryDuration = totalDuration / totalQueries;
    
    // Calculate median
    const sortedDurations = [...queryPerformanceStore]
      .map(q => q.duration)
      .sort((a, b) => a - b);
    
    const medianQueryDuration = sortedDurations.length % 2 === 0
      ? (sortedDurations[sortedDurations.length / 2 - 1] + sortedDurations[sortedDurations.length / 2]) / 2
      : sortedDurations[Math.floor(sortedDurations.length / 2)];
    
    return {
      totalQueries,
      slowQueries,
      slowQueryPercentage,
      averageQueryDuration,
      medianQueryDuration,
    };
  }
  
  /**
   * Get the slowest queries
   */
  public getSlowestQueries(limit: number = 10): QueryPerformance[] {
    return [...queryPerformanceStore]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }
  
  /**
   * Get query performance by model
   */
  public getPerformanceByModel(): Record<string, {
    queryCount: number;
    averageDuration: number;
    maxDuration: number;
    slowQueries: number;
  }> {
    const modelStats: Record<string, {
      queryCount: number;
      totalDuration: number;
      maxDuration: number;
      slowQueries: number;
    }> = {};
    
    for (const query of queryPerformanceStore) {
      if (!modelStats[query.model]) {
        modelStats[query.model] = {
          queryCount: 0,
          totalDuration: 0,
          maxDuration: 0,
          slowQueries: 0,
        };
      }
      
      const model = modelStats[query.model];
      model.queryCount++;
      model.totalDuration += query.duration;
      model.maxDuration = Math.max(model.maxDuration, query.duration);
      
      if (query.duration > this.slowQueryThreshold) {
        model.slowQueries++;
      }
    }
    
    // Convert to final format
    const result: Record<string, {
      queryCount: number;
      averageDuration: number;
      maxDuration: number;
      slowQueries: number;
    }> = {};
    
    for (const [model, stats] of Object.entries(modelStats)) {
      result[model] = {
        queryCount: stats.queryCount,
        averageDuration: stats.totalDuration / stats.queryCount,
        maxDuration: stats.maxDuration,
        slowQueries: stats.slowQueries,
      };
    }
    
    return result;
  }
  
  /**
   * Reset performance statistics
   */
  public resetStats(): void {
    queryPerformanceStore.length = 0;
  }
  
  /**
   * Get a health check report
   */
  public async getHealthReport(): Promise<{
    databaseConnected: boolean;
    connectionPool: ConnectionPoolStats;
    slowQueryStats: ReturnType<DatabaseMonitor['getSlowQueryStats']>;
    performanceByModel: ReturnType<DatabaseMonitor['getPerformanceByModel']>;
    cachePerformanceStats: ReturnType<DatabaseMonitor['getCachePerformanceStats']>;
  }> {
    const databaseConnected = await this.checkDatabaseConnection();
    const connectionPool = this.getConnectionPoolStats();
    const slowQueryStats = this.getSlowQueryStats();
    const performanceByModel = this.getPerformanceByModel();
    const cachePerformanceStats = this.getCachePerformanceStats();
    
    return {
      databaseConnected,
      connectionPool,
      slowQueryStats,
      performanceByModel,
      cachePerformanceStats,
    };
  }
  
  /**
   * Check if database is connected
   */
  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }
}

// Export a default instance
export const dbMonitor = DatabaseMonitor.getInstance();

// Export recordCacheMetric function for backward compatibility
export const recordCacheMetric = (operation: string, duration: number, hit: boolean) => {
  dbMonitor.recordCachePerformance(operation, duration, hit);
};

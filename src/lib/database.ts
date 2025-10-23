// Database connection configuration with pooling settings
export const databaseConfig = {
  // SQLite configuration (development)
  sqlite: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
    connectionLimit: 1, // SQLite only supports one connection
  },

  // PostgreSQL configuration (production)
  postgresql: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/thanawy',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2', 10),
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '20', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // 30 seconds
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10), // 2 seconds
  },

  // MySQL configuration (alternative production)
  mysql: {
    url: process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/thanawy',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2', 10),
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '20', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // 30 seconds
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10), // 2 seconds
  },

  // Common settings
  common: {
    logQueries: process.env.NODE_ENV === 'development',
    logSlowQueries: true,
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10), // 1 second
    retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000', 10), // 1 second
  }
};

/**
 * 数据库配置管理模块
 * 提供数据库连接参数的集中管理
 */

// 定义数据库配置接口
interface DatabaseConfig {
  /** 是否记录查询日志 */
  logQueries: boolean;
  /** 是否记录慢查询日志 */
  logSlowQueries: boolean;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 最大连接池大小 */
  maxPoolSize: number;
  /** 连接超时时间（毫秒） */
  connectionTimeout: number;
  /** 空闲超时时间（毫秒） */
  idleTimeout: number;
  /** 最小连接池大小 */
  minPoolSize: number;
  /** 连接池获取连接的超时时间 */
  acquireTimeout: number;
}

/**
 * 获取数据库基本配置
 * 从环境变量中读取配置，提供默认值
 */
export const getBaseDatabaseConfig = (): DatabaseConfig => {
  return {
    logQueries: process.env.DB_LOG_QUERIES?.toLowerCase() === 'true' || 
                process.env.NODE_ENV === 'development',
    logSlowQueries: process.env.DB_LOG_SLOW_QUERIES?.toLowerCase() === 'true' || 
                    process.env.NODE_ENV === 'development',
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000', 10),
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '20', 10),
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '5', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '5000', 10),
  };
};

// Get the appropriate configuration based on the database URL
export function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
  
  if (databaseUrl.startsWith('postgres')) {
    return {
      ...databaseConfig.postgresql,
      ...databaseConfig.common
    };
  }
  
  if (databaseUrl.startsWith('mysql')) {
    return {
      ...databaseConfig.mysql,
      ...databaseConfig.common
    };
  }
  
  // Default to SQLite
  return {
    ...databaseConfig.sqlite,
    ...databaseConfig.common
  };
}

// Connection pool monitoring
export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

// Default pool stats (for monitoring purposes)
export const defaultPoolStats: ConnectionPoolStats = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  waitingRequests: 0,
  maxConnections: 10,
  connectionTimeout: 30000, // 30 seconds
  idleTimeout: 60000, // 60 seconds
};

// Enhanced Prisma client with connection pooling capabilities
class EnhancedPrismaClient extends PrismaClient {
  private connectionPool: any[] = [];
  private maxPoolSize: number;
  private connectionTimeout: number;
  private idleTimeout: number;
  
  constructor() {
    // Get database configuration
    const dbConfig = getDatabaseConfig();
    
    // Configure Prisma client with optimized settings
    super({
      log: dbConfig.logQueries 
        ? [
            {
              emit: 'event',
              level: 'query',
            },
            {
              emit: 'stdout',
              level: 'error',
            },
            {
              emit: 'stdout',
              level: 'info',
            },
            {
              emit: 'stdout',
              level: 'warn',
            },
          ]
        : ['warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool configuration for better performance
      transactionOptions: {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      },
    });
    
    this.maxPoolSize = dbConfig.maxPoolSize || parseInt(process.env.DATABASE_MAX_POOL_SIZE || '10', 10);
    this.connectionTimeout = dbConfig.connectionTimeout || parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10);
    this.idleTimeout = dbConfig.idleTimeout || parseInt(process.env.DATABASE_IDLE_TIMEOUT || '60000', 10);
    
    // Set up connection monitoring
    this.setupConnectionMonitoring();
  }
  
  /**
   * Set up connection monitoring and optimization
   */
  private setupConnectionMonitoring(): void {
    // Monitor query performance
    this.$on('query', (e: any) => {
      // In a production environment, we might want to log slow queries
      if (e.duration > getDatabaseConfig().slowQueryThreshold) {
        console.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }
  
  /**
   * Get current connection pool statistics
   */
  public getConnectionPoolStats(): ConnectionPoolStats {
    // For SQLite, we return simulated stats since it doesn't have a real connection pool
    // In a production environment with PostgreSQL or MySQL, this would connect to the
    // database's monitoring APIs to get real statistics
    return {
      activeConnections: this.connectionPool.filter(conn => conn.inUse).length,
      idleConnections: this.connectionPool.filter(conn => !conn.inUse).length,
      totalConnections: this.connectionPool.length,
      maxConnections: this.maxPoolSize,
      connectionTimeout: this.connectionTimeout,
      idleTimeout: this.idleTimeout,
    };
  }
  
  /**
   * Optimize connection pool by closing idle connections
   */
  public optimizeConnectionPool(): void {
    const now = Date.now();
    this.connectionPool = this.connectionPool.filter(conn => {
      // Keep connections that are in use or not timed out yet
      return conn.inUse || (now - conn.lastUsed) < this.idleTimeout;
    });
  }
  
  /**
   * Acquire a connection from the pool
   */
  public async acquireConnection(): Promise<any> {
    // In a real implementation with a proper database that supports connection pooling,
    // this would acquire a connection from the pool
    
    // For SQLite, we simulate this behavior
    const connection = {
      id: Math.random().toString(36).substring(7),
      inUse: true,
      acquiredAt: Date.now(),
      lastUsed: Date.now(),
    };
    
    this.connectionPool.push(connection);
    return connection;
  }
  
  /**
   * Release a connection back to the pool
   */
  public releaseConnection(connectionId: string): void {
    const connection = this.connectionPool.find(conn => conn.id === connectionId);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }
}

// Export the enhanced Prisma client
export const enhancedPrisma = new EnhancedPrismaClient();

// Connection pooling utility functions
export const connectionPoolUtils = {
  /**
   * Check if connection pool needs optimization
   */
  shouldOptimizePool: (stats: ConnectionPoolStats): boolean => {
    // Optimize if more than 80% of connections are idle
    return stats.totalConnections > 0 && 
           (stats.idleConnections / stats.totalConnections) > 0.8;
  },
  
  /**
   * Get recommended pool size based on current usage
   */
  getRecommendedPoolSize: (stats: ConnectionPoolStats): number => {
    // Calculate recommended pool size based on usage patterns
    const utilization = stats.totalConnections > 0 ?
      (stats.activeConnections / stats.totalConnections) : 0;

    // If utilization is high, recommend increasing pool size
    if (utilization > 0.8) {
      return Math.min(stats.maxConnections * 1.5, 50); // Cap at 50
    }

    // If utilization is low, recommend decreasing pool size
    if (utilization < 0.2 && stats.totalConnections > 5) {
      return Math.max(stats.maxConnections * 0.8, 5); // Floor at 5
    }

    // Otherwise, keep current size
    return stats.maxConnections;
  }
};

import { PrismaClient } from '@prisma/client';

// Enhanced configuration with connection pooling optimized for production
const enhancedPrismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Query logging based on environment and configuration
  log: getDatabaseConfig().logQueries
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],

  // Connection pool configuration
  transactionOptions: {
    isolationLevel: 'ReadCommitted',
    maxWait: getBaseDatabaseConfig().connectionTimeout,
    timeout: getBaseDatabaseConfig().idleTimeout,
  },
};

// Create a single Prisma instance that will be reused
const createPrismaClient = () => {
  return new PrismaClient(enhancedPrismaConfig);
};

// Use a singleton pattern to ensure we only have one Prisma instance
const getPrismaInstance = () => {
  const globalPrisma = globalThis as any;

  if (!globalPrisma.prisma) {
    globalPrisma.prisma = createPrismaClient();

    // Add connection pool monitoring in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Database connection pool initialized with config:', {
        maxPoolSize: getBaseDatabaseConfig().maxPoolSize,
        minPoolSize: getBaseDatabaseConfig().minPoolSize,
        connectionTimeout: getBaseDatabaseConfig().connectionTimeout,
        idleTimeout: getBaseDatabaseConfig().idleTimeout,
        acquireTimeout: getBaseDatabaseConfig().acquireTimeout
      });
    }
  }

  return globalPrisma.prisma;
};

// Export the prisma instance
export const prisma = getPrismaInstance();

// Graceful shutdown handling
export const closeDatabaseConnection = async () => {
  await prisma.$disconnect();
};

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Add connection pool statistics monitoring
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DB_STATS === 'true') {
  // Periodically log connection pool stats
  setInterval(async () => {
    try {
      // This is a simple query to keep the connection pool active
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection pool is active');
    } catch (error) {
      console.error('Database connection pool health check failed:', error);
    }
  }, 60000); // Every minute
}

if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).prisma = prisma;
}

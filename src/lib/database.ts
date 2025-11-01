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

  // MongoDB Atlas configuration
  mongodb: {
    url: process.env.MONGODB_ATLAS_URI || 'mongodb://localhost:27017',
    retryWrites: true,
    w: 'majority',
    retryReads: true,
    readPreference: 'nearest'
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
  
  if (databaseUrl.startsWith('mongodb')) {
    return {
      ...databaseConfig.mongodb,
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
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
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

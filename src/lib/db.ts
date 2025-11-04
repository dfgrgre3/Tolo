import { prisma as prismaClient, enhancedPrisma as enhancedPrismaClient } from './db-unified';

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

// Define database configuration interface
export interface DatabaseConfig {
  /** Whether to log queries */
  logQueries: boolean;
  /** Whether to log slow queries */
  logSlowQueries: boolean;
  /** Slow query threshold (ms) */
  slowQueryThreshold: number;
  /** Maximum connection pool size */
  maxPoolSize: number;
  /** Connection timeout (ms) */
  connectionTimeout: number;
  /** Idle timeout (ms) */
  idleTimeout: number;
  /** Minimum connection pool size */
  minPoolSize: number;
  /** Connection acquisition timeout */
  acquireTimeout: number;
}

/**
 * Get base database configuration
 * Reads from environment variables, provides defaults
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
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
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

// Centralized Prisma clients sourced from db-unified singleton
export const prisma = prismaClient;
export const enhancedPrisma = enhancedPrismaClient;

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
      return Math.min(stats.maxConnections! * 1.5, 50); // Cap at 50
    }

    // If utilization is low, recommend decreasing pool size
    if (utilization < 0.2 && stats.totalConnections > 5) {
      return Math.max(stats.maxConnections! * 0.8, 5); // Floor at 5
    }

    // Otherwise, keep current size
    return stats.maxConnections!;
  }
};

// Graceful shutdown handling
export const closeDatabaseConnection = async () => {
  await prisma.$disconnect();
};

/**
 * Check if an error is a connection-related error that can be retried
 */
function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code || '';
  const fullError = `${errorMessage} ${errorCode}`.toLowerCase();
  
  return (
    fullError.includes('connect') ||
    fullError.includes('econnrefused') ||
    fullError.includes('etimedout') ||
    fullError.includes('p1001') || // Prisma connection error
    fullError.includes('p1017') || // Prisma server closed connection
    fullError.includes('enotfound') ||
    fullError.includes('econnreset') ||
    fullError.includes('epipe') ||
    fullError.includes('sqlite') ||
    fullError.includes('database') ||
    fullError.includes('timeout')
  );
}

/**
 * Retry a database operation with exponential backoff
 */
async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry on connection errors
      if (!isConnectionError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        maxRetries
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Health check function with retry logic
export const checkDatabaseHealth = async (retry: boolean = true): Promise<boolean> => {
  const operation = async () => {
    // For SQLite, we should first check if the database file exists and is accessible
    const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
    
    if (databaseUrl.startsWith('file:')) {
      // This is SQLite - check if file exists and is readable
      const fsPromises = await import('fs/promises');
      const pathModule = await import('path');
      
      // Extract file path from database URL
      const dbPath = databaseUrl.replace('file:', '');
      const fullPath = pathModule.resolve(process.cwd(), dbPath.startsWith('./') ? dbPath.substring(2) : dbPath);
      
      try {
        await fsPromises.access(fullPath);
      } catch (accessError) {
        // If database file doesn't exist, try to create it
        console.warn(`Database file not found at ${fullPath}, attempting to create directory structure...`);
        try {
          const dir = pathModule.dirname(fullPath);
          await fsPromises.mkdir(dir, { recursive: true });
          // File will be created by Prisma when we try to connect
        } catch (mkdirError) {
          console.error(`Failed to create database directory:`, mkdirError);
          throw new Error(`Database file not accessible and cannot create directory: ${fullPath}`);
        }
      }
    }
    
    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  };

  try {
    if (retry) {
      await retryDatabaseOperation(operation, 3, 1000);
      return true;
    } else {
      return await operation();
    }
  } catch (error) {
    console.error('Database health check failed:', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      databaseUrl: process.env.DATABASE_URL ? '***' : 'not set'
    });
    return false;
  }
};

/**
 * Ensure database connection is established
 * This function will attempt to connect and retry if necessary
 */
export const ensureDatabaseConnection = async (): Promise<boolean> => {
  try {
    // First check if Prisma client is available
    if (!prisma) {
      console.error('Prisma client is not available');
      return false;
    }

    // Try to connect
    try {
      await prisma.$connect();
    } catch (connectError) {
      // If already connected, this might throw, but it's okay
      if (!isConnectionError(connectError)) {
        console.warn('Connection attempt:', connectError instanceof Error ? connectError.message : String(connectError));
      }
    }

    // Verify connection with health check
    const isHealthy = await checkDatabaseHealth(true);
    return isHealthy;
  } catch (error) {
    console.error('Failed to ensure database connection:', error);
    return false;
  }
};

// Add connection pool statistics monitoring
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DB_STATS === 'true') {
  // Periodically log connection pool stats
  setInterval(async () => {
    try {
      // Check if database connection is healthy before running query
      const isHealthy = await checkDatabaseHealth();
      if (isHealthy) {
        await prisma.$queryRaw`SELECT 1`;
        console.log('Database connection pool is active');
      } else {
        console.warn('Database connection pool health check skipped due to connection issues');
      }
    } catch (error) {
      console.error('Database connection pool health check failed:', error);
      // Don't crash the application if health check fails
      // This can happen when the database file is temporarily inaccessible
    }
  }, 60000); // Every minute
}

if (process.env.NODE_ENV !== 'production') {
  // In non-production environments, enable additional logging
  console.log('Database module loaded in development mode');
}

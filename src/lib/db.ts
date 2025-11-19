/**
 * Unified database module - وحدة قاعدة البيانات الموحدة
 * 
 * ⚠️ CRITICAL: This file does NOT create Prisma Client instances.
 * ⚠️ CRITICAL: هذا الملف لا ينشئ نسخ جديدة من Prisma Client.
 * 
 * ⚠️ CRITICAL: NEVER import PrismaClient directly from '@prisma/client' in application code!
 * ⚠️ CRITICAL: لا تستورد PrismaClient مباشرة من '@prisma/client' في كود التطبيق!
 * 
 * ⚠️ CRITICAL: NEVER create new PrismaClient() instances anywhere else!
 * ⚠️ CRITICAL: لا تنشئ نسخ جديدة من PrismaClient في أي مكان آخر!
 * 
 * ✅ This file ONLY re-exports from db-unified.ts and database.ts.
 * ✅ هذا الملف يعيد التصدير فقط من db-unified.ts و database.ts.
 * 
 * 📋 Purpose: Compatibility layer that provides both Prisma client and database configuration.
 * 📋 الغرض: طبقة توافق توفر كل من عميل Prisma وإعدادات قاعدة البيانات.
 * 
 * 📦 Re-exports from:
 * 📦 يعيد التصدير من:
 *   - db-unified.ts: Prisma Client singleton instances (single source of truth)
 *   - database.ts: Database configuration (single source of truth)
 * 
 * ✅ All Prisma clients are sourced from db-unified.ts to ensure a single connection pool.
 * ✅ جميع عملاء Prisma مصدرهم db-unified.ts لضمان pool اتصال واحد فقط.
 * 
 * ❌ Creating multiple Prisma Client instances leads to "Too many connections" errors.
 * ❌ إنشاء نسخ متعددة من Prisma Client يؤدي إلى خطأ "Too many connections".
 * 
 * 📝 Usage:
 * 📝 الاستخدام:
 *   - Import Prisma: import { prisma } from '@/lib/db'
 *   - Import Config: import { databaseConfig } from '@/lib/db'
 *   - Both use the singleton instances (no new connections created)
 *   - كلاهما يستخدم النسخ الوحيدة (لا يتم إنشاء اتصالات جديدة)
 * 
 * 🔍 To check for conflicts, run: grep -r "new PrismaClient" src/
 * 🔍 للتحقق من التضارب، نفذ: grep -r "new PrismaClient" src/
 */

// ⚠️ CRITICAL: This file ONLY re-exports - it does NOT create Prisma Client instances
// ⚠️ CRITICAL: هذا الملف يعيد التصدير فقط - لا ينشئ نسخ جديدة من Prisma Client
// 
// ✅ All Prisma clients come from db-unified.ts (single source of truth)
// ✅ جميع عملاء Prisma تأتي من db-unified.ts (المصدر الوحيد الموثوق)
// 
// ❌ DO NOT import PrismaClient from '@prisma/client' here!
// ❌ لا تستورد PrismaClient من '@prisma/client' هنا!
// 
// ❌ DO NOT create new PrismaClient() instances here!
// ❌ لا تنشئ نسخ جديدة من PrismaClient() هنا!

// Re-export Prisma clients from db-unified.ts (single source of truth)
export { prisma, enhancedPrisma, default as prismaDefault } from './db-unified';

// Re-export database configuration from database.ts (single source of truth)
export {
  databaseConfig,
  getBaseDatabaseConfig,
  getDatabaseConfig,
  type ConnectionPoolStats,
  defaultPoolStats,
} from './database';

// Import for use in helper functions (this uses the singleton from db-unified.ts)
import { prisma } from './db-unified';
import { logger } from '@/lib/logger';

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
      logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, {
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
        logger.warn(`Database file not found at ${fullPath}, attempting to create directory structure...`);
        try {
          const dir = pathModule.dirname(fullPath);
          await fsPromises.mkdir(dir, { recursive: true });
          // File will be created by Prisma when we try to connect
        } catch (mkdirError) {
          logger.error(`Failed to create database directory:`, mkdirError);
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
    logger.error('Database health check failed:', {
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
      logger.error('Prisma client is not available');
      return false;
    }

    // Try to connect
    try {
      await prisma.$connect();
    } catch (connectError) {
      // If already connected, this might throw, but it's okay
      if (!isConnectionError(connectError)) {
        logger.warn('Connection attempt:', connectError instanceof Error ? connectError.message : String(connectError));
      }
    }

    // Verify connection with health check
    const isHealthy = await checkDatabaseHealth(true);
    return isHealthy;
  } catch (error) {
    logger.error('Failed to ensure database connection:', error);
    return false;
  }
};

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

// Add connection pool statistics monitoring
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DB_STATS === 'true') {
  // Periodically log connection pool stats
  setInterval(async () => {
    try {
      // Check if database connection is healthy before running query
      const isHealthy = await checkDatabaseHealth();
      if (isHealthy) {
        await prisma.$queryRaw`SELECT 1`;
        logger.info('Database connection pool is active');
      } else {
        logger.warn('Database connection pool health check skipped due to connection issues');
      }
    } catch (error) {
      logger.error('Database connection pool health check failed:', error);
      // Don't crash the application if health check fails
      // This can happen when the database file is temporarily inaccessible
    }
  }, 60000); // Every minute
}

if (process.env.NODE_ENV !== 'production') {
  // In non-production environments, enable additional logging
  logger.info('Database module loaded in development mode');
}

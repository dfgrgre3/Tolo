/**
 * ⭐ SINGLE SOURCE OF TRUTH FOR PRISMA CLIENT - المصدر الوحيد الموثوق لعميل Prisma
 * 
 * ⚠️ CRITICAL: هذا الملف هو المصدر الوحيد الذي ينشئ نسخة Prisma Client.
 * ⚠️ CRITICAL: This file is the ONLY source that creates a Prisma Client instance.
 * 
 * ❌ NEVER create new PrismaClient() instances anywhere else in the application!
 * ❌ لا تنشئ نسخ جديدة من PrismaClient في أي مكان آخر في التطبيق!
 * 
 * ✅ This file uses a global singleton pattern to ensure only ONE connection pool exists.
 * ✅ يستخدم هذا الملف نمط Singleton عالمي لضمان وجود pool اتصال واحد فقط.
 * 
 * ✅ All other files (db.ts, prisma.ts) re-export from this file.
 * ✅ جميع الملفات الأخرى (db.ts, prisma.ts) تعيد التصدير من هذا الملف.
 * 
 * ⚠️ Creating multiple Prisma Client instances leads to "Too many connections" errors.
 * ⚠️ إنشاء نسخ متعددة من Prisma Client يؤدي إلى خطأ "Too many connections".
 * 
 * For more information, see: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */

// This file must only run on the server - prevent browser bundling
// Note: We use runtime checks instead of 'server-only' to prevent build-time errors
// when this file is imported through dynamic imports in client components

// Runtime check to ensure this only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('db-unified.ts can only be used on the server');
}

import { PrismaClient } from '@prisma/client';
import { databaseConfig, getDatabaseConfig } from './database';

// Lazy load logger to prevent circular dependencies and client bundling issues
// Use a synchronous wrapper that falls back to console if logger isn't loaded yet
interface LoggerInterface {
  info: (message: string, context?: unknown, details?: Record<string, unknown>) => void;
  warn: (message: string, context?: unknown, details?: Record<string, unknown>) => void;
  error: (message: string, context?: unknown, details?: Record<string, unknown>) => void;
  debug: (message: string, context?: unknown, details?: Record<string, unknown>) => void;
}

let loggerInstance: LoggerInterface | null = null;
let loggerLoading: Promise<LoggerInterface> | null = null;

function getLoggerSync() {
  // If logger is already loaded, return it
  if (loggerInstance) {
    return loggerInstance;
  }
  
  // If we're on the client, return a no-op logger
  if (typeof window !== 'undefined') {
    return {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
  }
  
  // If logger is being loaded, return a console-based logger temporarily
  if (loggerLoading) {
    return {
      info: (message: string) => console.info('[Logger not loaded yet]', message),
      warn: (message: string) => console.warn('[Logger not loaded yet]', message),
      error: (message: string) => console.error('[Logger not loaded yet]', message),
      debug: (message: string) => console.debug('[Logger not loaded yet]', message),
    };
  }
  
  // Start loading logger (async, but return sync wrapper)
  loggerLoading = import('@/lib/logger').then(module => {
    loggerInstance = module.logger as LoggerInterface;
    return loggerInstance;
  }).catch(() => {
    // If loading fails, use console as fallback
    loggerInstance = {
      info: (message: string) => console.info(message),
      warn: (message: string) => console.warn(message),
      error: (message: string) => console.error(message),
      debug: (message: string) => console.debug(message),
    };
    return loggerInstance;
  });
  
  // Return console-based logger while loading
  return {
    info: (message: string) => console.info('[Logger loading...]', message),
    warn: (message: string) => console.warn('[Logger loading...]', message),
    error: (message: string) => console.error('[Logger loading...]', message),
    debug: (message: string) => console.debug('[Logger loading...]', message),
  };
}

// Export logger getter for synchronous use
const logger = new Proxy({} as LoggerInterface, {
  get: (target, prop) => {
    const loggerInstance = getLoggerSync();
    const method = (loggerInstance as Record<string, unknown>)[prop as string];
    if (typeof method === 'function') {
      return method.bind(loggerInstance);
    }
    return method;
  }
}) as LoggerInterface;

type ConnectionPoolStats = {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
};

// Helper function to check if Prisma Client is available
const isPrismaClientAvailable = (): boolean => {
  try {
    // Try to access PrismaClient constructor
    return typeof PrismaClient !== 'undefined' && PrismaClient !== null;
  } catch {
    return false;
  }
};

// Create an appropriately configured Prisma client
const createPrismaClient = () => {
  // Check if Prisma Client is available
  if (!isPrismaClientAvailable()) {
    const errorMessage = `
Prisma Client has not been generated yet. Please run:
  npx prisma generate

Or if using npm:
  npm run prisma:generate

This will generate the Prisma Client based on your schema.prisma file.
    `.trim();
    
    throw new Error(errorMessage);
  }

  try {
    const databaseUrl = process.env.DATABASE_URL || databaseConfig.sqlite.url;
    
    // Validate DATABASE_URL format and detect database type
    if (!databaseUrl) {
      logger.warn('DATABASE_URL is not set, using default SQLite database');
    } else {
      // Detect database type from URL
      if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        logger.info('PostgreSQL database detected');
      } else if (databaseUrl.startsWith('file:')) {
        logger.warn('SQLite database detected - not recommended for production');
        if (process.env.NODE_ENV === 'production') {
          logger.error('SQLite is not suitable for production environments like Vercel');
          logger.error('Please migrate to PostgreSQL (Neon, Supabase, or custom PostgreSQL)');
        }
      }
    }

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: databaseConfig.common.logQueries
        ? [
            { level: 'query', emit: 'event' },
            { level: 'info', emit: 'event' },
            { level: 'warn', emit: 'event' },
            { level: 'error', emit: 'event' },
          ]
        : [
            { level: 'error', emit: 'event' },
            { level: 'warn', emit: 'event' },
          ],
    });

    // Add error handler for connection errors
    prisma.$on('error' as never, (e: { message?: string; [key: string]: unknown }) => {
      logger.error(`Prisma error event: ${e.message || JSON.stringify(e)}`, undefined, { details: e });
    });

    if (databaseConfig.common.logSlowQueries) {
      prisma.$on('query' as never, async (e: { duration: number; query: string; timestamp: Date }) => {
        if (e.duration > databaseConfig.common.slowQueryThreshold) {
          logger.warn('Slow query detected:', undefined, {
            duration: e.duration,
            query: e.query,
            timestamp: e.timestamp,
          });
        }
      });
    }

    // Add connection error handling with improved retry logic
    interface PrismaWithUse {
      $use?: (middleware: (params: { model?: string; action?: string; args?: unknown }, next: (params: unknown) => Promise<unknown>) => Promise<unknown>) => void;
    }
    const prismaWithUse = prisma as unknown as PrismaWithUse;
    if (typeof prismaWithUse.$use === 'function') {
      prismaWithUse.$use(async (params: { model?: string; action?: string; args?: unknown }, next: (params: unknown) => Promise<unknown>) => {
        try {
          return await next(params);
        } catch (error: unknown) {
          // Handle connection errors
          const errorObj = error as { code?: string; message?: string };
          if (errorObj?.code === 'P1001' || errorObj?.code === 'P1017' || 
              errorObj?.message?.includes('Connection') ||
              errorObj?.message?.includes('ECONNREFUSED') ||
              errorObj?.message?.includes('ETIMEDOUT')) {
            logger.error('Database connection error:', undefined, {
              code: errorObj.code,
              message: errorObj.message,
              databaseUrl: databaseUrl ? '***' : 'not set'
            });
            
            // Try to reconnect with retry
            let reconnectSuccess = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                // Disconnect if needed
                try {
                  await prisma.$disconnect();
                } catch (disconnectError) {
                  // Ignore disconnect errors
                }
                
                // Wait a bit before reconnecting
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                
                // Try to reconnect
                await prisma.$connect();
                logger.info(`Database reconnected successfully (attempt ${attempt})`);
                reconnectSuccess = true;
                
                // Retry the operation once after successful reconnection
                return await next(params);
              } catch (reconnectError: unknown) {
                const reconnectErrorObj = reconnectError as { message?: string };
                logger.warn(`Reconnection attempt ${attempt} failed:`, undefined, { message: reconnectErrorObj.message });
                if (attempt === 3) {
                  logger.error('Failed to reconnect to database after all attempts');
                  throw error; // Throw original error
                }
              }
            }
            
            if (!reconnectSuccess) {
              throw error;
            }
          }
          throw error;
        }
      });
    } else {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Prisma $use is not available, connection error handling middleware will be limited');
      }
    }

    return prisma;
  } catch (error: unknown) {
    // Check if error is about Prisma Client not being initialized
    const errorObj = error as { message?: string; code?: string };
    if (errorObj?.message?.includes('did not initialize yet') || 
        errorObj?.message?.includes('prisma generate')) {
      const errorMessage = `
Prisma Client has not been generated yet. Please run:
  npx prisma generate

Or if using npm:
  npm run prisma:generate

Original error: ${errorObj.message}
      `.trim();
      
      throw new Error(errorMessage);
    }
    
    // Handle EPERM errors (Windows file locking issues)
    if (errorObj?.code === 'EPERM' || errorObj?.message?.includes('EPERM')) {
      const errorMessage = `
Prisma Client generation failed due to file permission error (EPERM).
This usually happens when the Prisma Client files are locked by another process.

Solutions:
1. Close any running development servers or processes using Prisma
2. Try running: npx prisma generate
3. If the issue persists, restart your terminal/IDE
4. On Windows, check if any antivirus is blocking the file

Original error: ${errorObj.message}
      `.trim();
      
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Re-throw other errors
    throw error;
  }
};

const prismaClientSingleton = () => {
  return createPrismaClient();
};

type GlobalPrismaContext = typeof globalThis & {
  prismaGlobal?: ReturnType<typeof prismaClientSingleton>;
  prismaPoolStats?: ConnectionPoolStats;
  prismaPoolMiddlewareRegistered?: boolean;
};

const globalForPrisma = globalThis as GlobalPrismaContext;

// Runtime check to detect multiple Prisma Client instances
// This helps identify if someone accidentally creates a new PrismaClient instance
if (process.env.NODE_ENV === 'development') {
  const existingInstance = (globalThis as GlobalPrismaContext).prismaGlobal;
  if (existingInstance && existingInstance !== globalForPrisma.prismaGlobal) {
    logger.warn('⚠️ WARNING: Multiple Prisma Client instances detected! This can cause "Too many connections" errors.');
    logger.warn('⚠️ Make sure you are importing from "@/lib/db-unified", "@/lib/db", or "@/lib/prisma" only.');
    logger.warn('⚠️ NEVER import PrismaClient directly from "@prisma/client" and create new instances!');
  }
}

// Lazy initialization function - only creates Prisma client when first accessed
const getPrismaClient = (): ReturnType<typeof prismaClientSingleton> => {
  if (!globalForPrisma.prismaGlobal) {
    try {
      globalForPrisma.prismaGlobal = prismaClientSingleton();
      
      // Log in development to help debug connection issues
      if (process.env.NODE_ENV === 'development') {
        logger.info('✅ Prisma Client singleton instance created (single connection pool)');
      }
    } catch (error: unknown) {
      // Provide a helpful error message if Prisma Client isn't generated
      const errorObj = error as { message?: string };
      if (errorObj?.message?.includes('did not initialize yet') || 
          errorObj?.message?.includes('prisma generate') ||
          errorObj?.message?.includes('has not been generated')) {
        const errorMessage = `
❌ Prisma Client has not been generated yet!

Please run one of the following commands:
  npx prisma generate
  npm run prisma:generate
  npm run postinstall

This will generate the Prisma Client based on your prisma/schema.prisma file.

Original error: ${errorObj.message}
        `.trim();
        
        throw new Error(errorMessage);
      }
      throw error;
    }
  }
  return globalForPrisma.prismaGlobal;
};

// Resolve the active database configuration for pool telemetry
const resolvedDbConfig = getDatabaseConfig() as {
  maxPoolSize?: number;
  connectionLimit?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
};

const maxConnections = Math.max(
  1,
  resolvedDbConfig.maxPoolSize ??
    resolvedDbConfig.connectionLimit ??
    1,
);

const connectionTimeout =
  typeof resolvedDbConfig.connectionTimeout === 'number'
    ? resolvedDbConfig.connectionTimeout
    : 5000;

const idleTimeout =
  typeof resolvedDbConfig.idleTimeout === 'number'
    ? resolvedDbConfig.idleTimeout
    : 30000;

if (!globalForPrisma.prismaPoolStats) {
  globalForPrisma.prismaPoolStats = {
    totalConnections: maxConnections,
    activeConnections: 0,
    idleConnections: maxConnections,
    waitingRequests: 0,
    maxConnections,
    connectionTimeout,
    idleTimeout,
  };
}

const poolStats = globalForPrisma.prismaPoolStats;

// Initialize Prisma client with middleware and extensions (lazy)
const initializePrismaWithMiddleware = () => {
  const prisma = getPrismaClient();

  if (!globalForPrisma.prismaPoolMiddlewareRegistered) {
    try {
      // Check if $use is available before using it
      interface PrismaWithUse {
        $use?: (middleware: (params: { model?: string; action?: string; args?: unknown }, next: (params: unknown) => Promise<unknown>) => Promise<unknown>) => void;
      }
      const prismaWithUse = prisma as unknown as PrismaWithUse;
      if (typeof prismaWithUse.$use === 'function') {
        prismaWithUse.$use(async (params: { model?: string; action?: string; args?: unknown }, next: (params: unknown) => Promise<unknown>) => {
          poolStats.activeConnections += 1;
          poolStats.totalConnections = Math.max(
            poolStats.totalConnections,
            poolStats.activeConnections,
          );

          const overCapacity = poolStats.activeConnections > maxConnections;
          if (overCapacity) {
            poolStats.waitingRequests += 1;
          }

          poolStats.idleConnections = Math.max(
            maxConnections - poolStats.activeConnections,
            0,
          );

          try {
            return await next(params);
          } finally {
            poolStats.activeConnections = Math.max(
              poolStats.activeConnections - 1,
              0,
            );

            if (overCapacity && poolStats.waitingRequests > 0) {
              poolStats.waitingRequests -= 1;
            }

            poolStats.idleConnections = Math.max(
              maxConnections - poolStats.activeConnections,
              0,
            );
          }
        });

        globalForPrisma.prismaPoolMiddlewareRegistered = true;
      } else {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Prisma $use is not available, connection pool monitoring will be limited');
        }
        // Mark as registered even if we couldn't set up middleware to avoid retrying
        globalForPrisma.prismaPoolMiddlewareRegistered = true;
      }
    } catch (error: unknown) {
      // If middleware setup fails, log but don't throw
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Failed to set up Prisma middleware:', error);
      }
      // Mark as registered to avoid infinite retries
      globalForPrisma.prismaPoolMiddlewareRegistered = true;
    }
  }

  return prisma;
};

// Get Prisma client with lazy initialization
const getPrisma = () => {
  try {
    return initializePrismaWithMiddleware();
  } catch (error: unknown) {
    // Re-throw with helpful message
    throw error;
  }
};

// Create enhanced Prisma client with extensions
const getEnhancedPrisma = () => {
  const prisma = getPrisma();
  
  try {
    return prisma.$extends({
      client: {
        getConnectionPoolStats(): ConnectionPoolStats {
          return { ...poolStats };
        },
        optimizeConnectionPool(): void {
          poolStats.idleConnections = Math.max(
            maxConnections - poolStats.activeConnections,
            0,
          );
          poolStats.waitingRequests = Math.max(
            poolStats.waitingRequests - 1,
            0,
          );
        },
      },
    });
  } catch (error: unknown) {
    // If extension fails, return base prisma client
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Failed to create enhanced Prisma client, using base client:', error);
    }
    return prisma;
  }
};

// Lazy initialization - only create Prisma clients when accessed
// This prevents Prisma Client from being initialized during module evaluation
let prismaInstance: ReturnType<typeof getPrisma> | null = null;
let enhancedPrismaInstance: ReturnType<typeof getEnhancedPrisma> | null = null;

// Create a proxy object that throws a helpful error when any method is called
const createErrorProxy = <T>(message: string): T => {
  return new Proxy({} as T, {
    get: (target, prop) => {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        // Allow Promise inspection
        return undefined;
      }
      throw new Error(message);
    },
    apply: () => {
      throw new Error(message);
    }
  });
};

// Lazy getter for prisma client
const getPrismaLazy = (): ReturnType<typeof getPrisma> => {
  if (!prismaInstance) {
    try {
      prismaInstance = getPrisma();
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      const errorMessage = errorObj?.message || `
❌ Prisma Client has not been generated yet!

Please run one of the following commands:
  npx prisma generate
  npm run prisma:generate

This will generate the Prisma Client based on your prisma/schema.prisma file.
      `.trim();
      prismaInstance = createErrorProxy<ReturnType<typeof getPrisma>>(errorMessage);
    }
  }
  return prismaInstance as ReturnType<typeof getPrisma>;
};

// Lazy getter for enhanced prisma client
const getEnhancedPrismaLazy = (): ReturnType<typeof getEnhancedPrisma> => {
  if (!enhancedPrismaInstance) {
    try {
      enhancedPrismaInstance = getEnhancedPrisma();
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      const errorMessage = errorObj?.message || `
❌ Prisma Client has not been generated yet!

Please run one of the following commands:
  npx prisma generate
  npm run prisma:generate

This will generate the Prisma Client based on your prisma/schema.prisma file.
      `.trim();
      enhancedPrismaInstance = createErrorProxy<ReturnType<typeof getEnhancedPrisma>>(errorMessage);
    }
  }
  return enhancedPrismaInstance as ReturnType<typeof getEnhancedPrisma>;
};

// Export lazy getters that create Prisma clients only when accessed
// Use PrismaClient type directly to ensure proper type inference
export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    const instance = getPrismaLazy();
    const value = (instance as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
}) as ReturnType<typeof getPrisma>;

// Export enhancedPrisma with proper type that includes all Prisma models
// Using PrismaClient type directly ensures TypeScript recognizes all model properties
// ⚠️ DEPRECATED: enhancedPrisma is deprecated, use prisma instead
// ⚠️ Use direct import: import { prisma } from '@/lib/prisma'
export const enhancedPrisma: PrismaClient = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    const instance = getEnhancedPrismaLazy();
    const value = (instance as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
}) as ReturnType<typeof getEnhancedPrisma>;

// Export connection pool stats functions directly (recommended way)
// ✅ Use these functions instead of enhancedPrisma for pool statistics
/**
 * Get current connection pool statistics
 * ✅ Recommended way to get pool stats
 */
export function getConnectionPoolStats(): ConnectionPoolStats {
  // Initialize prisma to ensure middleware is set up
  getPrismaLazy();
  return { ...poolStats };
}

/**
 * Optimize connection pool by closing idle connections
 * ✅ Recommended way to optimize pool
 */
export function optimizeConnectionPool(): void {
  // Initialize prisma to ensure middleware is set up
  getPrismaLazy();
  poolStats.idleConnections = Math.max(
    maxConnections - poolStats.activeConnections,
    0,
  );
  poolStats.waitingRequests = Math.max(
    poolStats.waitingRequests - 1,
    0,
  );
}

export default prisma;

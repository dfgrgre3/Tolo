// This file must only run on the server - prevent browser bundling
import 'server-only';

import { PrismaClient } from '@prisma/client';
import { databaseConfig, getDatabaseConfig } from './database';

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
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || databaseConfig.sqlite.url,
        },
      },
      log: databaseConfig.common.logQueries
        ? [
            { level: 'query', emit: 'event' },
            { level: 'info', emit: 'event' },
            { level: 'warn', emit: 'event' },
          ]
        : undefined,
    });

    if (databaseConfig.common.logSlowQueries) {
      prisma.$on('query' as any, async (e: any) => {
        if (e.duration > databaseConfig.common.slowQueryThreshold) {
          console.warn('Slow query detected:', {
            duration: e.duration,
            query: e.query,
            timestamp: e.timestamp,
          });
        }
      });
    }

    return prisma;
  } catch (error: any) {
    // Check if error is about Prisma Client not being initialized
    if (error?.message?.includes('did not initialize yet') || 
        error?.message?.includes('prisma generate')) {
      const errorMessage = `
Prisma Client has not been generated yet. Please run:
  npx prisma generate

Or if using npm:
  npm run prisma:generate

Original error: ${error.message}
      `.trim();
      
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

// Lazy initialization function - only creates Prisma client when first accessed
const getPrismaClient = (): ReturnType<typeof prismaClientSingleton> => {
  if (!globalForPrisma.prismaGlobal) {
    try {
      globalForPrisma.prismaGlobal = prismaClientSingleton();
    } catch (error: any) {
      // Provide a helpful error message if Prisma Client isn't generated
      if (error?.message?.includes('did not initialize yet') || 
          error?.message?.includes('prisma generate') ||
          error?.message?.includes('has not been generated')) {
        const errorMessage = `
❌ Prisma Client has not been generated yet!

Please run one of the following commands:
  npx prisma generate
  npm run prisma:generate
  npm run postinstall

This will generate the Prisma Client based on your prisma/schema.prisma file.

Original error: ${error.message}
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
      prisma.$use(async (params, next) => {
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
    } catch (error) {
      // If middleware setup fails, log but don't throw
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to set up Prisma middleware:', error);
      }
    }
  }

  return prisma;
};

// Get Prisma client with lazy initialization
const getPrisma = () => {
  try {
    return initializePrismaWithMiddleware();
  } catch (error: any) {
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
  } catch (error) {
    // If extension fails, return base prisma client
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to create enhanced Prisma client, using base client:', error);
    }
    return prisma;
  }
};

// Lazy initialization - only create Prisma clients when accessed
// This prevents Prisma Client from being initialized during module evaluation
let prismaInstance: ReturnType<typeof getPrisma> | null = null;
let enhancedPrismaInstance: ReturnType<typeof getEnhancedPrisma> | null = null;

// Create a proxy object that throws a helpful error when any method is called
const createErrorProxy = (message: string) => {
  return new Proxy({}, {
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
  }) as any;
};

// Lazy getter for prisma client
const getPrismaLazy = (): ReturnType<typeof getPrisma> => {
  if (!prismaInstance) {
    try {
      prismaInstance = getPrisma();
    } catch (error: any) {
      const errorMessage = error?.message || `
❌ Prisma Client has not been generated yet!

Please run one of the following commands:
  npx prisma generate
  npm run prisma:generate

This will generate the Prisma Client based on your prisma/schema.prisma file.
      `.trim();
      prismaInstance = createErrorProxy(errorMessage);
    }
  }
  return prismaInstance;
};

// Lazy getter for enhanced prisma client
const getEnhancedPrismaLazy = (): ReturnType<typeof getEnhancedPrisma> => {
  if (!enhancedPrismaInstance) {
    try {
      enhancedPrismaInstance = getEnhancedPrisma();
    } catch (error: any) {
      const errorMessage = error?.message || `
❌ Prisma Client has not been generated yet!

Please run one of the following commands:
  npx prisma generate
  npm run prisma:generate

This will generate the Prisma Client based on your prisma/schema.prisma file.
      `.trim();
      enhancedPrismaInstance = createErrorProxy(errorMessage);
    }
  }
  return enhancedPrismaInstance;
};

// Export lazy getters that create Prisma clients only when accessed
export const prisma = new Proxy({} as ReturnType<typeof getPrisma>, {
  get: (target, prop) => {
    const instance = getPrismaLazy();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export const enhancedPrisma = new Proxy({} as ReturnType<typeof getEnhancedPrisma>, {
  get: (target, prop) => {
    const instance = getEnhancedPrismaLazy();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export default prisma;

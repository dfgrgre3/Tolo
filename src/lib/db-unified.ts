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

// Create an appropriately configured Prisma client
const createPrismaClient = () => {
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

// Ensure we have a single instance of Prisma client
const prisma = globalForPrisma.prismaGlobal ?? prismaClientSingleton();

// In non-production environments, cache the client globally
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = prisma;
}

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

if (!globalForPrisma.prismaPoolMiddlewareRegistered) {
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
}

const enhancedPrisma = prisma.$extends({
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

export { prisma, enhancedPrisma };
export default prisma;

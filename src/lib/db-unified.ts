import { PrismaClient } from '@prisma/client';
import { databaseConfig } from './database';

// Define the PrismaClient with appropriate configuration
const createPrismaClient = () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || databaseConfig.sqlite.url,
      },
    },
    log: databaseConfig.common.logQueries ? [
      { level: 'query', emit: 'event' },
      { level: 'info', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ] : undefined,
  });

  // Log slow queries
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

// Create a singleton instance for the Prisma client
const prismaClientSingleton = () => {
  return createPrismaClient();
};

// TypeScript declaration for global caching
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// Ensure we have a single instance of Prisma client
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// In non-production environments, cache the client globally
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Enhanced Prisma client with middleware
const enhancedPrisma = prisma.$extends({
  // Add any custom methods or enhancements here
  model: {
    // Example of a custom method
    // user: {
    //   async findByEmail(email: string) {
    //     return prisma.user.findUnique({
    //       where: { email }
    //     });
    //   }
    // }
  }
});

export { prisma, enhancedPrisma };
export default prisma;
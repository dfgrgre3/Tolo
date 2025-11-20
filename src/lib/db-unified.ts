/**
 * ⭐ UNIFIED DATABASE CONNECTION - اتصال قاعدة البيانات الموحد
 * 
 * This file creates a SINGLE Prisma Client instance using the singleton pattern.
 * هذا الملف ينشئ نسخة واحدة من Prisma Client باستخدام نمط Singleton.
 */

import { PrismaClient } from '@prisma/client';

// Lazy load logger to prevent circular dependencies
let logger: any = null;

async function getLogger() {
  if (!logger) {
    try {
      const loggerModule = await import('@/lib/logger');
      logger = loggerModule.logger;
    } catch (error) {
      logger = {
        info: (msg: string) => console.log(msg),
        warn: (msg: string) => console.warn(msg),
        error: (msg: string, ...args: any[]) => console.error(msg, ...args),
        debug: (msg: string) => console.debug(msg),
      };
    }
  }
  return logger;
}

// Global singleton instance
type GlobalPrismaContext = typeof globalThis & {
  prismaGlobal?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrismaContext;

// Lazy load database config to prevent circular dependencies
let dbConfig: any = null;

async function getDatabaseConfig() {
  if (!dbConfig) {
    try {
      const databaseModule = await import('./database');
      dbConfig = databaseModule.getDatabaseConfig();
    } catch (error) {
      // Fallback to basic config
      dbConfig = {
        url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
      };
    }
  }
  return dbConfig;
}

// Create Prisma Client with proper configuration
const createPrismaClient = async () => {
  const config = await getDatabaseConfig();
  
  return new PrismaClient({
    datasources: {
      db: {
        url: config.url,
      },
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

// Get or create the singleton instance
let prismaInstance: PrismaClient | null = null;

// Create a synchronous prisma instance
const createSyncPrisma = () => {
  if (!prismaInstance) {
    // Create a basic instance synchronously
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
        },
      },
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });

    // Then asynchronously update with proper config
    createPrismaClient().then((enhancedPrisma) => {
      // Disconnect the basic instance
      prismaInstance?.$disconnect();
      // Replace with the enhanced instance
      prismaInstance = enhancedPrisma;
    }).catch((error) => {
      console.error('Failed to create enhanced Prisma client:', error);
    });
  }
  return prismaInstance;
};

export const prisma = globalForPrisma.prismaGlobal ?? createSyncPrisma();

// Store in global for development hot-reloading
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = prisma;
}

// Default export
export default prisma;

// Initialize logger asynchronously
if (typeof window === 'undefined') {
  getLogger().then((log) => {
    log.info('✅ Prisma Client singleton initialized');
  }).catch(() => {
    console.log('✅ Prisma Client singleton initialized');
  });
}

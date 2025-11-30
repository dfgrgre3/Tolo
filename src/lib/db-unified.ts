/**
 * ⭐ UNIFIED DATABASE CONNECTION - اتصال قاعدة البيانات الموحد
 * 
 * This file creates a SINGLE Prisma Client instance using the singleton pattern.
 * هذا الملف ينشئ نسخة واحدة من Prisma Client باستخدام نمط Singleton.
 */

import { PrismaClient } from '@prisma/client';
import { URLSearchParams } from 'url';
import { getDatabaseConfig } from './database';

// Global singleton instance
type GlobalPrismaContext = typeof globalThis & {
  prismaGlobal?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrismaContext;

// Create Prisma Client with proper configuration
const createPrismaClient = () => {
  const config = getDatabaseConfig();

  let url = config.url;

  // Append pooling parameters for PostgreSQL and MySQL from the config
  if (config.url && (config.url.startsWith('postgres') || config.url.startsWith('mysql'))) {
    const params = new URLSearchParams();

    // Use maxPoolSize for connection_limit, a common Prisma parameter
    if ('maxPoolSize' in config && config.maxPoolSize) {
      params.append('connection_limit', String(config.maxPoolSize));
    }

    // Use connectionTimeout for connect_timeout, converting from ms to seconds
    if ('connectionTimeout' in config && typeof (config as any).connectionTimeout === 'number') {
      params.append('connect_timeout', String(Math.round((config as any).connectionTimeout / 1000)));
    }

    const paramString = params.toString();
    if (paramString) {
      // Ensure we correctly append parameters
      url = `${url}${url.includes('?') ? '&' : '?'}${paramString}`;
    }
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

// Get or create the singleton instance
export const prisma = globalForPrisma.prismaGlobal ?? createPrismaClient();

// Store in global for development hot-reloading
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = prisma;
}

// Default export
export default prisma;

// Log initialization
if (typeof window === 'undefined') {
  // Simple console log to avoid circular dependency with logger
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Prisma Client singleton initialized');
  }
}

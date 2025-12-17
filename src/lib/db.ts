/**
 * ⭐ UNIFIED DATABASE CONNECTION - اتصال قاعدة البيانات الموحد
 * 
 * This file creates a SINGLE Prisma Client instance using the singleton pattern.
 * هذا الملف ينشئ نسخة واحدة من Prisma Client باستخدام نمط Singleton.
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Global singleton instance
type GlobalPrismaContext = typeof globalThis & {
    prismaGlobal?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrismaContext;

// Create Prisma Client with proper configuration
const createPrismaClient = () => {
    const connectionString = process.env.DATABASE_URL;

    const pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,  // 5 second connection timeout
        idleTimeoutMillis: 30000,       // 30 second idle timeout
        max: 20,                        // Maximum pool size
    });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    } as any);
};

// Get or create the singleton instance
export const prisma = globalForPrisma.prismaGlobal ?? createPrismaClient();

// Store in global for development hot-reloading
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaGlobal = prisma;
}

// Re-export Prisma namespace for JsonNull and other utilities
export { Prisma } from '@prisma/client';

// Default export
export default prisma;



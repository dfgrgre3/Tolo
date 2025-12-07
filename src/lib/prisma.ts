/**
 * Prisma Client Re-export
 * 
 * This file re-exports the Prisma client from the main db.ts file
 * to maintain backward compatibility with existing imports.
 * 
 * ⚠️ DEPRECATED: Please import from '@/lib/db' instead of '@/lib/prisma'
 * This file exists only for backward compatibility.
 */

// Re-export everything from db.ts
export { prisma, Prisma } from './db';
export { default } from './db';

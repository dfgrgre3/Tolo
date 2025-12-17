/**
 * Database Connection Helper
 * Provides utilities for database connection management
 */

import { prisma } from './db';

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Ensure database connection is established
 */
export async function ensureDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    throw error;
  }
}

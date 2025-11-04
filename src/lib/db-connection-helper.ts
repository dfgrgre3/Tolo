// This file must only run on the server - prevent browser bundling
import 'server-only';

import { prisma, checkDatabaseHealth, ensureDatabaseConnection } from './db';
import { databaseConfig } from './database';

/**
 * Database connection helper utilities
 * Provides functions to test, diagnose, and fix database connection issues
 */

export interface DatabaseConnectionDiagnostics {
  isConnected: boolean;
  databaseUrl: string;
  databaseType: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb' | 'unknown';
  error?: string;
  recommendations?: string[];
}

/**
 * Diagnose database connection issues
 */
export async function diagnoseDatabaseConnection(): Promise<DatabaseConnectionDiagnostics> {
  const diagnostics: DatabaseConnectionDiagnostics = {
    isConnected: false,
    databaseUrl: process.env.DATABASE_URL || 'not set',
    databaseType: 'unknown',
    recommendations: []
  };

  try {
    // Determine database type
    const databaseUrl = process.env.DATABASE_URL || databaseConfig.sqlite.url;
    diagnostics.databaseUrl = databaseUrl;

    if (databaseUrl.startsWith('postgres')) {
      diagnostics.databaseType = 'postgresql';
    } else if (databaseUrl.startsWith('mysql')) {
      diagnostics.databaseType = 'mysql';
    } else if (databaseUrl.startsWith('mongodb')) {
      diagnostics.databaseType = 'mongodb';
    } else if (databaseUrl.startsWith('file:')) {
      diagnostics.databaseType = 'sqlite';
    }

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      diagnostics.recommendations?.push(
        'DATABASE_URL environment variable is not set. Set it in your .env.local file.'
      );
    }

    // For SQLite, check if file exists
    if (diagnostics.databaseType === 'sqlite') {
      const fsPromises = await import('fs/promises');
      const pathModule = await import('path');
      
      const dbPath = databaseUrl.replace('file:', '');
      const fullPath = pathModule.resolve(process.cwd(), dbPath.startsWith('./') ? dbPath.substring(2) : dbPath);
      
      try {
        await fsPromises.access(fullPath);
        diagnostics.recommendations?.push('SQLite database file exists and is accessible.');
      } catch (error) {
        diagnostics.recommendations?.push(
          `SQLite database file not found at: ${fullPath}. It will be created on first connection.`
        );
      }
    }

    // Test connection
    try {
      const isHealthy = await checkDatabaseHealth(true);
      diagnostics.isConnected = isHealthy;
      
      if (isHealthy) {
        diagnostics.recommendations?.push('Database connection is healthy.');
      } else {
        diagnostics.recommendations?.push('Database connection test failed. Check your database configuration.');
      }
    } catch (error: any) {
      diagnostics.isConnected = false;
      diagnostics.error = error?.message || String(error);
      
      // Provide specific recommendations based on error type
      if (error?.code === 'P1001') {
        diagnostics.recommendations?.push(
          'Cannot reach database server. Check if your database server is running and accessible.'
        );
      } else if (error?.code === 'P1017') {
        diagnostics.recommendations?.push(
          'Database server closed the connection. Try reconnecting or check server logs.'
        );
      } else if (error?.message?.includes('EPERM')) {
        diagnostics.recommendations?.push(
          'File permission error. Close any processes using the database file and try again.'
        );
      } else if (error?.message?.includes('prisma generate')) {
        diagnostics.recommendations?.push(
          'Prisma Client not generated. Run: npx prisma generate'
        );
      }
    }
  } catch (error: any) {
    diagnostics.isConnected = false;
    diagnostics.error = error?.message || String(error);
    diagnostics.recommendations?.push('An unexpected error occurred during diagnosis.');
  }

  return diagnostics;
}

/**
 * Test database connection with retry
 */
export async function testDatabaseConnection(maxRetries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const isConnected = await ensureDatabaseConnection();
      if (isConnected) {
        console.log(`Database connection test successful (attempt ${attempt}/${maxRetries})`);
        return true;
      }
    } catch (error) {
      console.warn(`Database connection test failed (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt === maxRetries) {
        console.error('All database connection attempts failed');
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return false;
}

/**
 * Get database connection status
 */
export async function getDatabaseConnectionStatus(): Promise<{
  connected: boolean;
  databaseType: string;
  databaseUrl: string;
  error?: string;
}> {
  try {
    const isHealthy = await checkDatabaseHealth(false);
    const databaseUrl = process.env.DATABASE_URL || databaseConfig.sqlite.url;
    
    let databaseType = 'unknown';
    if (databaseUrl.startsWith('postgres')) databaseType = 'postgresql';
    else if (databaseUrl.startsWith('mysql')) databaseType = 'mysql';
    else if (databaseUrl.startsWith('mongodb')) databaseType = 'mongodb';
    else if (databaseUrl.startsWith('file:')) databaseType = 'sqlite';

    return {
      connected: isHealthy,
      databaseType,
      databaseUrl: databaseUrl ? '***' : 'not set'
    };
  } catch (error: any) {
    return {
      connected: false,
      databaseType: 'unknown',
      databaseUrl: 'not set',
      error: error?.message || String(error)
    };
  }
}

/**
 * Initialize database connection on startup
 * Call this function early in your application lifecycle
 */
export async function initializeDatabaseConnection(): Promise<boolean> {
  try {
    console.log('Initializing database connection...');
    
    // First, ensure connection
    const isConnected = await ensureDatabaseConnection();
    
    if (isConnected) {
      console.log('Database connection initialized successfully');
      return true;
    } else {
      console.error('Failed to initialize database connection');
      
      // Try to diagnose the issue
      const diagnostics = await diagnoseDatabaseConnection();
      console.error('Database connection diagnostics:', diagnostics);
      
      return false;
    }
  } catch (error) {
    console.error('Error initializing database connection:', error);
    return false;
  }
}

// Export for use in API routes or server components
export { checkDatabaseHealth, ensureDatabaseConnection };


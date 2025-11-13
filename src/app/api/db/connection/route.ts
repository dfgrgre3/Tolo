import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { opsWrapper } from '@/lib/middleware/ops-middleware';

import {
  diagnoseDatabaseConnection,
  testDatabaseConnection,
  getDatabaseConnectionStatus,
  initializeDatabaseConnection
} from '@/lib/db-connection-helper';

/**
 * GET /api/db/connection
 * Get database connection status and diagnostics
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

      switch (action) {
        case 'diagnose':
          // Full diagnostics
          const diagnostics = await diagnoseDatabaseConnection();
          return NextResponse.json({
            success: true,
            diagnostics
          });

        case 'test':
          // Test connection with retry
          const testResult = await testDatabaseConnection(3);
          return NextResponse.json({
            success: testResult,
            message: testResult
              ? 'Database connection test passed'
              : 'Database connection test failed'
          });

        case 'initialize':
          // Initialize connection
          const initResult = await initializeDatabaseConnection();
          return NextResponse.json({
            success: initResult,
            message: initResult
              ? 'Database connection initialized successfully'
              : 'Failed to initialize database connection'
          });

        default:
          // Get status
          const status = await getDatabaseConnectionStatus();
          return NextResponse.json({
            success: true,
            status
          });
      }
    } catch (error: any) {
      logger.error('Database connection API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Unknown error',
          message: 'Failed to check database connection'
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/db/connection
 * Initialize or test database connection
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json().catch(() => ({}));
    const { action = 'test' } = body;

      switch (action) {
        case 'initialize':
          const initResult = await initializeDatabaseConnection();
          return NextResponse.json({
            success: initResult,
            message: initResult
              ? 'Database connection initialized successfully'
              : 'Failed to initialize database connection'
          });

        case 'test':
          const testResult = await testDatabaseConnection(3);
          return NextResponse.json({
            success: testResult,
            message: testResult
              ? 'Database connection test passed'
              : 'Database connection test failed'
          });

        default:
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid action',
              message: 'Supported actions: initialize, test'
            },
            { status: 400 }
          );
      }
    } catch (error: any) {
      logger.error('Database connection API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Unknown error',
          message: 'Failed to process database connection request'
        },
        { status: 500 }
      );
    }
  });
}


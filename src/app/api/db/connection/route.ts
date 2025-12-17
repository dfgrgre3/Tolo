import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { opsWrapper } from '@/lib/middleware/ops-middleware';

import {
  checkDatabaseHealth,
  ensureDatabaseConnection,
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
        case 'test':
          // Test connection
          const testResult = await checkDatabaseHealth();
          return NextResponse.json({
            success: testResult,
            message: testResult
              ? 'Database connection test passed'
              : 'Database connection test failed'
          });

        case 'initialize':
          // Initialize connection
          try {
            await ensureDatabaseConnection();
            return NextResponse.json({
              success: true,
              message: 'Database connection initialized successfully'
            });
          } catch (error) {
            return NextResponse.json({
              success: false,
              message: 'Failed to initialize database connection'
            });
          }

        default:
          // Get status (simple check)
          const status = await checkDatabaseHealth();
          return NextResponse.json({
            success: true,
            status: {
              connected: status,
              timestamp: new Date().toISOString()
            }
          });
      }
    } catch (error: unknown) {
      logger.error('Database connection API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
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
          try {
            await ensureDatabaseConnection();
            return NextResponse.json({
              success: true,
              message: 'Database connection initialized successfully'
            });
          } catch (error) {
            return NextResponse.json({
              success: false,
              message: 'Failed to initialize database connection'
            });
          }

        case 'test':
          const testResult = await checkDatabaseHealth();
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
    } catch (error: unknown) {
      logger.error('Database connection API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: 'Failed to process database connection request'
        },
        { status: 500 }
      );
    }
  });
}


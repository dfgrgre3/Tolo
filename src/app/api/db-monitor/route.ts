import { NextRequest, NextResponse } from 'next/server';
import { getDbPoolStats } from '@/lib/db-monitor';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * GET /api/db-monitor
 * Get database monitoring information
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // In a real implementation, you would verify the user has admin privileges
      // For now, we'll just check if the user is authenticated
      const token = req.headers.get('authorization')?.replace('Bearer ', '');

      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Verify token (in a real implementation, check for admin role)
      const decoded = null;
      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Get monitoring data
      const healthReport = await getDbPoolStats();

      return NextResponse.json(healthReport);
    } catch (error) {
      logger.error('Database monitoring error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/db-monitor/reset
 * Reset database monitoring statistics
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // In a real implementation, you would verify the user has admin privileges
      const token = req.headers.get('authorization')?.replace('Bearer ', '');

      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Verify token (in a real implementation, check for admin role)
      const decoded = null;
      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Check if this is a reset request
      const { action } = await req.json();

      if (action === 'reset') {
        return NextResponse.json({ message: 'Statistics reset not supported' });
      }

      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    } catch (error) {
      logger.error('Database monitoring error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

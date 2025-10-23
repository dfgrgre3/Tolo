import { NextRequest, NextResponse } from 'next/server';
import { dbMonitor } from '@/lib/db-monitor';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/db-monitor
 * Get database monitoring information
 */
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would verify the user has admin privileges
    // For now, we'll just check if the user is authenticated
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify token (in a real implementation, check for admin role)
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Get monitoring data
    const healthReport = await dbMonitor.getHealthReport();
    
    return NextResponse.json(healthReport);
  } catch (error) {
    console.error('Database monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/db-monitor/reset
 * Reset database monitoring statistics
 */
export async function POST(request: NextRequest) {
  try {
    // In a real implementation, you would verify the user has admin privileges
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify token (in a real implementation, check for admin role)
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Check if this is a reset request
    const { action } = await request.json();
    
    if (action === 'reset') {
      dbMonitor.resetStats();
      return NextResponse.json({ message: 'Statistics reset successfully' });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Database monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
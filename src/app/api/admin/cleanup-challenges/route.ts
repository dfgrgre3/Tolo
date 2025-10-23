import { NextRequest, NextResponse } from 'next/server';
import { manualCleanup } from '@/lib/cleanup-expired-challenges';

/**
 * Admin API route for manually cleaning up expired authentication challenges
 * This is useful for development and can be called periodically in production
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization (you might want to implement proper admin auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await manualCleanup();

    if (result.success) {
      return NextResponse.json({
        message: 'Cleanup completed successfully',
        cleaned: result.cleaned
      });
    } else {
      return NextResponse.json(
        { error: 'Cleanup failed', details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Manual cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check the status of challenges (development only)
 */
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you might want to add admin authorization here too

    // For development purposes, return basic info about challenges
    return NextResponse.json({
      message: 'Challenge cleanup system is operational',
      note: 'Use POST method to manually trigger cleanup'
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * NextAuth session endpoint
 * This endpoint is required by next-auth/react SessionProvider
 * Returns null session since we're using custom auth system
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
    // Return null session in the format expected by next-auth
    // This prevents CLIENT_FETCH_ERROR from next-auth/react
    // next-auth expects either a Session object or null
    return NextResponse.json(
      null, // null session indicates no authenticated user
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    logger.error('Session endpoint error:', error);
    // Return null session even on error to prevent next-auth errors
    return NextResponse.json(
      null,
      {
        status: 200, // Return 200 with null to prevent error handling in next-auth
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
    }
  });
}


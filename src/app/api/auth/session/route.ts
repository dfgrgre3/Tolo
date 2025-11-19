import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * NextAuth session endpoint (Legacy compatibility)
 * 
 * ⚠️ NOTE: This endpoint exists for backward compatibility only.
 * NextAuth has been removed from this project in favor of custom auth (@/lib/auth-service).
 * 
 * This endpoint returns null session since we're using custom auth system.
 * It prevents CLIENT_FETCH_ERROR from any legacy next-auth/react SessionProvider calls.
 * 
 * See ENVIRONMENT_ISSUES.md and AUTH_STRUCTURE_CLEAN.md for details.
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
    // ⚠️ Legacy: Return null session in the format expected by NextAuth (removed library)
    // This prevents CLIENT_FETCH_ERROR from any legacy next-auth/react SessionProvider calls
    // NextAuth expects either a Session object or null
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
    // ⚠️ Legacy: Return null session even on error to prevent NextAuth errors
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


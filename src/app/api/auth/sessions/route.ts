import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { withEnhancedAuth } from '@/lib/auth/enhanced-middleware';
import { addSecurityHeaders, createStandardErrorResponse, parseRequestBody } from '@/app/api/auth/_helpers';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authResult = await withEnhancedAuth(request, {
      requireAuth: true,
      checkSession: true,
    });

    if (!authResult.success) {
      return authResult.response;
    }

    const { user, sessionId } = authResult;

    const sessions = await authService.getUserSessions(user.id);

    // Map to safe response format
    const safeSessions = sessions.map(session => ({
      id: session.id,
      userAgent: session.userAgent,
      ip: session.ip,
      deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo) : null,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed,
      isCurrent: session.id === sessionId
    }));

    const response = NextResponse.json({
      sessions: safeSessions
    });

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('Get sessions error:', error);
    return createStandardErrorResponse(error, 'Failed to retrieve sessions');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await withEnhancedAuth(request, {
      requireAuth: true,
      checkSession: true,
    });

    if (!authResult.success) {
      return authResult.response;
    }

    const { user, sessionId: currentSessionId } = authResult;

    const bodyResult = await parseRequestBody<{ sessionId: string }>(request);
    if (!bodyResult.success) return bodyResult.error;

    const { sessionId } = bodyResult.data;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Prevent revoking current session via this endpoint (use logout instead)
    if (sessionId === currentSessionId) {
      return NextResponse.json(
        { error: 'Cannot revoke current session via this endpoint', code: 'INVALID_OPERATION' },
        { status: 400 }
      );
    }

    const success = await authService.revokeSession(sessionId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Session not found or could not be revoked', code: 'OPERATION_FAILED' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Session revoked successfully'
    });

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('Revoke session error:', error);
    return createStandardErrorResponse(error, 'Failed to revoke session');
  }
}

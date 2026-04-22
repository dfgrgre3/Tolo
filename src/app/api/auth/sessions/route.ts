import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session-service';
import { handleApiError, extractClientInfo } from '@/lib/api-utils';
import { SecurityLogger, SecurityEventType } from '@/services/auth/security-logger';

type SessionItem = Awaited<ReturnType<typeof SessionService.getActiveSessions>>[number];
/**
 * GET /api/auth/sessions
 * Returns all active sessions for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await SessionService.getActiveSessions(userId);

    // Parse deviceInfo if it's stored as JSON string
    const parsedSessions = sessions.map((session: SessionItem) => ({
      ...session,
      deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo) : null,
      isCurrent: session.id === (req.cookies.get('session_id')?.value || '')
    }));

    return NextResponse.json({ sessions: parsedSessions }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/auth/sessions
 * Revokes a session or all sessions.
 * 
 * Query params:
 * - id: specific session ID to revoke
 * - all: if true, revoke ALL sessions EXCEPT current one
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let sessionIdToRevoke = searchParams.get('id');
    let revokeAll = searchParams.get('all') === 'true';

    // Support JSON body for session revocation (common in frontend frameworks)
    try {
      const body = await req.json();
      if (body.sessionId) sessionIdToRevoke = body.sessionId;
      if (body.all !== undefined) revokeAll = body.all;
    } catch (_e) {

      // Ignore if body is empty or invalid JSON
    }
    const currentSessionId = req.cookies.get('session_id')?.value;
    const { ip, userAgent } = extractClientInfo(req);

    if (revokeAll) {
      // Logout from all devices except current one
      await SessionService.revokeAllSessions(userId, currentSessionId);
      await SecurityLogger.log({
        userId,
        eventType: SecurityEventType.LOGOUT_ALL_DEVICES,
        ip,
        userAgent,
        metadata: { currentSessionId }
      });
      return NextResponse.json({ success: true, message: 'Logged out from all other devices' });
    }

    if (!sessionIdToRevoke) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const sessions = await SessionService.getActiveSessions(userId);
    const sessionExists = sessions.find((s: SessionItem) => s.id === sessionIdToRevoke);

    if (!sessionExists) {
      return NextResponse.json({ error: 'Session not found or already revoked' }, { status: 404 });
    }

    await SessionService.revokeSession(sessionIdToRevoke);

    await SecurityLogger.log({
      userId,
      eventType: SecurityEventType.SESSION_REVOKED,
      ip,
      userAgent,
      metadata: { revokedSessionId: sessionIdToRevoke }
    });

    return NextResponse.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
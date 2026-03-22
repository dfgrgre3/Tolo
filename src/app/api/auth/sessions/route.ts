import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session-service';
import { SecurityLogger, SecurityEventType } from '@/services/auth/security-logger';
import { withAuth, extractClientInfo, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/sessions
 * 
 * Returns all active sessions for the current user.
 * Used in the session management UI to show connected devices.
 */
export async function GET(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const sessions = await SessionService.getActiveSessions(userId);

            // Mark the current session
            const currentSessionId = req.cookies.get('session_id')?.value;

            const sessionsWithCurrent = sessions.map(session => ({
                ...session,
                isCurrent: session.id === currentSessionId,
            }));

            return NextResponse.json(
                { sessions: sessionsWithCurrent },
                { status: 200 }
            );
        } catch (error) {
            return handleApiError(error);
        }
    });
}

/**
 * DELETE /api/auth/sessions
 * 
 * Revoke a specific session by ID.
 * Body: { sessionId: string }
 * 
 * Allows users to remotely log out other devices.
 */
export async function DELETE(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const body = await req.json();
            const { sessionId } = body;

            if (!sessionId) {
                return NextResponse.json(
                    { error: 'Session ID is required' },
                    { status: 400 }
                );
            }

            const session = await prisma.session.findUnique({
                where: { id: sessionId },
                select: {
                    id: true,
                    userId: true,
                },
            });

            if (!session) {
                return NextResponse.json(
                    { error: 'Session not found' },
                    { status: 404 }
                );
            }

            if (session.userId !== userId) {
                return NextResponse.json(
                    { error: 'Forbidden' },
                    { status: 403 }
                );
            }

            const { ip, userAgent } = extractClientInfo(req);

            // Revoke the specified session
            await SessionService.revokeSession(sessionId);

            // Log the event
            await SecurityLogger.log({
                userId,
                eventType: SecurityEventType.SESSION_REVOKED,
                ip,
                userAgent,
                metadata: { revokedSessionId: sessionId },
            });

            return NextResponse.json(
                { message: 'Session revoked successfully' },
                { status: 200 }
            );
        } catch (error) {
            return handleApiError(error);
        }
    });
}

/**
 * PATCH /api/auth/sessions
 * 
 * Toggle trust status of a session.
 */
export async function PATCH(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const { ip, userAgent } = extractClientInfo(req);
            const body = await req.json();
            const { sessionId, isTrusted } = body;

            if (!sessionId) {
                return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
            }

            if (typeof isTrusted !== 'boolean') {
                return NextResponse.json({ error: 'isTrusted must be a boolean' }, { status: 400 });
            }

            const updated = await SessionService.toggleSessionTrust(sessionId, userId, isTrusted);
            if (!updated) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            await SecurityLogger.logTrustChange(userId, ip, userAgent, sessionId, isTrusted);

            return NextResponse.json({ success: true });
        } catch (error) {
            return handleApiError(error);
        }
    });
}

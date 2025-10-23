import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifySession, revokeSession, getUserSessions } from '@/lib/auth-enhanced';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify access token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user sessions
    const sessions = await getUserSessions(decoded.userId);
    
    return NextResponse.json({
      sessions: sessions.map(session => ({
        id: session.id,
        userAgent: session.userAgent,
        ip: session.ip,
        deviceInfo: JSON.parse(session.deviceInfo),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastAccessed: session.lastAccessed,
        isActive: session.isActive,
        isCurrent: session.id === decoded.sessionId
      }))
    });
  } catch (error) {
    console.error('Session management error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify access token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns this session
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Revoke session
    await revokeSession(sessionId);
    
    return NextResponse.json({
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Session revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

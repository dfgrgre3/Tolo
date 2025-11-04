import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const userId = verification.user.id;
    const currentSessionId = verification.sessionId;

    // Get all active sessions for user
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastAccessed: 'desc',
      },
    });

    // Parse and format sessions
    const formattedSessions = sessions.map((session: any) => {
      let deviceInfo: any = {};
      try {
        deviceInfo = JSON.parse(session.deviceInfo);
      } catch {
        // If parsing fails, extract from user agent
        deviceInfo = {
          browser: parseBrowser(session.userAgent),
          os: parseOS(session.userAgent),
        };
      }

      return {
        id: session.id,
        deviceInfo: session.deviceInfo,
        browser: deviceInfo.browser || parseBrowser(session.userAgent),
        os: deviceInfo.os || parseOS(session.userAgent),
        ip: session.ip,
        createdAt: session.createdAt,
        lastAccessed: session.lastAccessed,
        isActive: session.isActive,
        isCurrent: session.id === currentSessionId,
        trusted: true, // Can be enhanced with trust logic
      };
    });

    // Get session statistics
    const stats = {
      total: formattedSessions.length,
      active: formattedSessions.filter((s: any) => s.isActive).length,
      trusted: formattedSessions.filter((s: any) => s.trusted).length,
    };

    return NextResponse.json({
      sessions: formattedSessions,
      statistics: stats,
    });

  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'فشل جلب الجلسات' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const userId = verification.user.id;
    const currentSessionId = verification.sessionId;

    // Delete all sessions except current
    const result = await prisma.session.deleteMany({
      where: {
        userId,
        id: { not: currentSessionId },
      },
    });

    // Log security event
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    await authService.logSecurityEvent(
      userId,
      'all_sessions_revoked',
      ip,
      {
        userAgent,
        sessionsRevoked: result.count,
        currentSessionId,
      }
    );

    return NextResponse.json({
      message: 'تم إلغاء جميع الجلسات بنجاح',
      revokedCount: result.count,
    });

  } catch (error) {
    console.error('Failed to revoke sessions:', error);
    return NextResponse.json(
      { error: 'فشل إلغاء الجلسات' },
      { status: 500 }
    );
  }
}

// Helper functions
function parseBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function parseOS(userAgent: string): string {
  if (userAgent.includes('Windows NT 10.0')) return 'Windows 10';
  if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
  if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Unknown';
}

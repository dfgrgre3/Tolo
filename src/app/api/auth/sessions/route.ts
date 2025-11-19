import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Enhanced authentication verification with timeout protection
      const verifyPromise = authService.verifyTokenFromRequest(req);
      const timeoutPromise = new Promise<{ isValid: false; error: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            isValid: false,
            error: 'انتهت مهلة التحقق من المصادقة',
          });
        }, 5000); // 5 second timeout
      });

      const verification = await Promise.race([verifyPromise, timeoutPromise]);
    
      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { 
            error: verification.error || 'غير مصرح',
            code: 'UNAUTHORIZED',
          },
          { status: 401 }
        );
      }

      // Enhanced user ID validation
      if (!verification.user.id || typeof verification.user.id !== 'string' || verification.user.id.trim().length === 0) {
        return NextResponse.json(
          { 
            error: 'بيانات المستخدم غير صحيحة',
            code: 'INVALID_USER_DATA',
          },
          { status: 401 }
        );
      }

      const userId = verification.user.id.trim();
      
      // Validate user ID format
      if (userId.length < 10 || userId.length > 100) {
        return NextResponse.json(
          { 
            error: 'معرف المستخدم غير صحيح',
            code: 'INVALID_USER_ID',
          },
          { status: 401 }
        );
      }

      const currentSessionId = verification.sessionId ? verification.sessionId.trim() : null;

    // Get all active sessions for user with timeout protection
    const sessionsPromise = prisma.session.findMany({
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
      take: 50, // Limit to 50 sessions for performance
    });

    const sessionsTimeoutPromise = new Promise<[]>(resolve => {
      setTimeout(() => resolve([]), 3000); // 3 second timeout
    });

    const sessions = await Promise.race([sessionsPromise, sessionsTimeoutPromise]);

    // Parse and format sessions with enhanced validation
    const formattedSessions = sessions
      .filter((session: any) => session && session.id) // Filter out invalid sessions
      .map((session: any) => {
        // Validate session ID
        if (!session.id || typeof session.id !== 'string' || session.id.trim().length === 0) {
          return null;
        }

        let deviceInfo: any = {};
        try {
          // Safely parse device info with validation
          if (session.deviceInfo && typeof session.deviceInfo === 'string') {
            const parsed = JSON.parse(session.deviceInfo);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              deviceInfo = parsed;
            }
          }
        } catch {
          // If parsing fails, extract from user agent
          deviceInfo = {
            browser: parseBrowser(session.userAgent || ''),
            os: parseOS(session.userAgent || ''),
          };
        }

        // Sanitize IP address (limit length)
        const sanitizedIp = session.ip && typeof session.ip === 'string'
          ? session.ip.substring(0, 45) // IPv6 max length
          : 'unknown';

        return {
          id: session.id.trim(),
          deviceInfo: session.deviceInfo || null,
          browser: deviceInfo.browser || parseBrowser(session.userAgent || ''),
          os: deviceInfo.os || parseOS(session.userAgent || ''),
          ip: sanitizedIp,
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed,
          isActive: Boolean(session.isActive),
          isCurrent: session.id === currentSessionId,
          trusted: true, // Can be enhanced with trust logic
        };
      })
      .filter((session: any) => session !== null); // Remove null entries

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
    logger.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'فشل جلب الجلسات' },
      { status: 500 }
    );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Enhanced authentication verification with timeout protection
      const verifyPromise = authService.verifyTokenFromRequest(req);
      const timeoutPromise = new Promise<{ isValid: false; error: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            isValid: false,
            error: 'انتهت مهلة التحقق من المصادقة',
          });
        }, 5000); // 5 second timeout
      });

      const verification = await Promise.race([verifyPromise, timeoutPromise]);
    
      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { 
            error: verification.error || 'غير مصرح',
            code: 'UNAUTHORIZED',
          },
          { status: 401 }
        );
      }

      // Enhanced user ID validation
      if (!verification.user.id || typeof verification.user.id !== 'string' || verification.user.id.trim().length === 0) {
        return NextResponse.json(
          { 
            error: 'بيانات المستخدم غير صحيحة',
            code: 'INVALID_USER_DATA',
          },
          { status: 401 }
        );
      }

      const userId = verification.user.id.trim();
      
      // Validate user ID format
      if (userId.length < 10 || userId.length > 100) {
        return NextResponse.json(
          { 
            error: 'معرف المستخدم غير صحيح',
            code: 'INVALID_USER_ID',
          },
          { status: 401 }
        );
      }

      const currentSessionId = verification.sessionId ? verification.sessionId.trim() : null;

      // Delete all sessions except current with timeout protection
      const deletePromise = prisma.session.deleteMany({
        where: {
          userId,
          ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
        },
      });

      const deleteTimeoutPromise = new Promise<{ count: number }>((resolve) => {
        setTimeout(() => resolve({ count: 0 }), 3000); // 3 second timeout
      });

      const result = await Promise.race([deletePromise, deleteTimeoutPromise]);

      // Log security event (non-blocking)
      const ip = authService.getClientIP(req) || 'unknown';
      const userAgent = authService.getUserAgent(req) || 'unknown';
      
      authService.logSecurityEvent(
        userId,
        'all_sessions_revoked',
        ip,
        {
          userAgent,
          sessionsRevoked: result.count,
          currentSessionId,
        }
      ).catch(() => {
        // Silent fail - logging shouldn't block response
      });

    return NextResponse.json({
      message: 'تم إلغاء جميع الجلسات بنجاح',
      revokedCount: result.count,
    });

  } catch (error) {
    logger.error('Failed to revoke sessions:', error);
    return NextResponse.json(
      { error: 'فشل إلغاء الجلسات' },
      { status: 500 }
    );
    }
  });
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

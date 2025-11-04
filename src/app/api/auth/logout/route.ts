import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { clearAuthCookies, createErrorResponse } from '../_helpers';

export async function POST(request: NextRequest) {
  try {
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    let sessionId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await authService.verifyToken(token);
      if (decoded.isValid && decoded.sessionId) {
        sessionId = decoded.sessionId;
      }
    }

    // Parse body to check if user wants to logout from all devices
    let logoutAllDevices = false;
    try {
      const body = await request.json();
      logoutAllDevices = Boolean(body.logoutAllDevices);
    } catch {
      // No body or invalid JSON - use default
    }

    if (sessionId) {
      // Get session to retrieve userId
      const session = await authService.getSession(sessionId);
      
      if (session) {
        if (logoutAllDevices) {
          // Delete all sessions for this user
          await authService.deleteAllUserSessions(session.userId);
          
          // Log security event
          await authService.logSecurityEvent(session.userId, 'logout_all_devices', ip, {
            userAgent,
            sessionId,
          });
        } else {
          // Delete only current session
          await authService.deleteSession(sessionId);
          
          // Log security event
          await authService.logSecurityEvent(session.userId, 'logout', ip, {
            userAgent,
            sessionId,
          });
        }
      }
    }

    // Create response
    const response = NextResponse.json({
      message: 'تم تسجيل الخروج بنجاح.'
    });

    // Clear all auth cookies
    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return createErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء معالجة طلب تسجيل الخروج. حاول مرة أخرى لاحقاً.'
    );
  }
}
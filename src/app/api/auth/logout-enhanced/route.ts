import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, revokeSession } from '@/lib/auth-enhanced';
import { getDeviceInfo, getLocationFromIP } from '@/lib/security-utils';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
               
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    let sessionId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify access token to get session ID
      const decoded = await verifyToken(token);
      if (decoded) {
        sessionId = decoded.sessionId;
      }
    }

    const { logoutAllDevices } = await request.json();

    if (sessionId) {
      if (logoutAllDevices) {
        // Extract userId from session to revoke all sessions
        const session = await prisma.session.findUnique({
          where: { id: sessionId }
        });
        
        if (session) {
          // Revoke all sessions for this user
          await prisma.session.updateMany({
            where: {
              userId: session.userId
            },
            data: { isActive: false }
          });
          
          // Log security event
          const deviceInfo = await getDeviceInfo(userAgent);
          const location = await getLocationFromIP(ip);
          
          await prisma.securityLog.create({
            data: {
              userId: session.userId,
              eventType: 'LOGOUT_ALL',
              ip,
              userAgent,
              deviceInfo: JSON.stringify(deviceInfo),
              location
            }
          });
        }
      } else {
        // Revoke only current session
        await revokeSession(sessionId);
        
        // Log security event
        const deviceInfo = await getDeviceInfo(userAgent);
        const location = await getLocationFromIP(ip);
        
        // Get user from session for logging
        const session = await prisma.session.findUnique({
          where: { id: sessionId }
        });
        
        if (session) {
          await prisma.securityLog.create({
            data: {
              userId: session.userId,
              eventType: 'LOGOUT',
              ip,
              userAgent,
              deviceInfo: JSON.stringify(deviceInfo),
              location
            }
          });
        }
      }
    }

    // Create response
    const response = NextResponse.json({
      message: 'Logged out successfully'
    });

    // Clear refresh token cookie
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

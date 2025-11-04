import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    // Get refresh token from cookie or request body
    let refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body.refreshToken;
      } catch {
        // No body or invalid JSON
      }
    }

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
      
      // Clear refresh token cookie
      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      
      return response;
    }

    // Verify refresh token using authService
    const tokens = await authService.refreshAccessToken(refreshToken, userAgent, ip);
    
    if (!tokens.isValid || !tokens.accessToken || !tokens.refreshToken) {
      const response = NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
      
      // Clear refresh token cookie
      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      
      return response;
    }

    const response = NextResponse.json({
      message: 'تم تحديث الرمز بنجاح.',
      token: tokens.accessToken
    });

    // Set new refresh token in httpOnly cookie
    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { 
        error: 'حدث خطأ غير متوقع أثناء معالجة طلب تحديث الرمز. حاول مرة أخرى لاحقاً.'
      },
      { status: 500 }
    );
  }
}
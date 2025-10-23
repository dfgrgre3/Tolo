import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken } from '@/lib/auth-enhanced';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or request body
    let refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      const body = await request.json();
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    const tokens = await verifyRefreshToken(refreshToken);
    
    if (!tokens) {
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
      message: 'Token refreshed successfully',
      token: tokens.accessToken
    });

    // Set new refresh token in httpOnly cookie
    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Google
    if (error) {
      console.error('Google OAuth error:', error);
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول بجوجل';
      
      // Map Google error codes to user-friendly Arabic messages
      const errorMessages: Record<string, string> = {
        'access_denied': 'تم إلغاء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        'invalid_request': 'طلب غير صحيح. يرجى المحاولة مرة أخرى.',
        'unauthorized_client': 'تطبيق غير مصرح به. يرجى التواصل مع الدعم الفني.',
        'unsupported_response_type': 'نوع استجابة غير مدعوم. يرجى التواصل مع الدعم الفني.',
        'invalid_scope': 'نطاق غير صحيح. يرجى التواصل مع الدعم الفني.',
        'server_error': 'خطأ في خادم Google. يرجى المحاولة مرة أخرى لاحقاً.',
        'temporarily_unavailable': 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
      };
      
      errorMessage = errorMessages[error] || errorMessage;
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=${error}&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // Verify state parameter to prevent CSRF attacks
    const savedState = request.cookies.get('oauth_state')?.value;
    if (!state || !savedState || !verifyState(state, savedState)) {
      console.error('Google OAuth: Invalid state parameter', { state, savedState });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_state&message=${encodeURIComponent('فشل التحقق من الأمان. يرجى المحاولة مرة أخرى.')}`
      );
    }

    if (!code) {
      console.error('Google OAuth: No authorization code received');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=no_code&message=${encodeURIComponent('لم يتم استلام رمز التفويض من Google. يرجى المحاولة مرة أخرى.')}`
      );
    }

    // Validate OAuth configuration before making token request
    if (!oauthConfig.google.clientId || !oauthConfig.google.clientSecret) {
      console.error('Google OAuth: Missing credentials in callback');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent('إعدادات Google OAuth غير مكتملة. يرجى التحقق من إعدادات الخادم.')}`
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: oauthConfig.google.clientId,
        client_secret: oauthConfig.google.clientSecret,
        code,
        redirect_uri: oauthConfig.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Google OAuth token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
      });
      
      let errorMessage = 'فشل الحصول على رمز الوصول من Google.';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error === 'invalid_grant') {
          errorMessage = 'رمز التفويض غير صحيح أو منتهي الصلاحية. يرجى المحاولة مرة أخرى.';
        } else if (errorData.error === 'invalid_client') {
          errorMessage = 'معرف العميل غير صحيح. يرجى التواصل مع الدعم الفني.';
        } else if (errorData.error_description) {
          errorMessage = errorData.error_description;
        }
      } catch (e) {
        // If JSON parsing fails, use default message
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error&message=${encodeURIComponent(errorMessage)}`
      );
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Google OAuth token error:', tokenData);
      let errorMessage = 'فشل الحصول على رمز الوصول من Google.';
      if (tokenData.error_description) {
        errorMessage = tokenData.error_description;
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error&message=${encodeURIComponent(errorMessage)}`
      );
    }

    if (!tokenData.access_token) {
      console.error('Google OAuth: No access token in response');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error&message=${encodeURIComponent('لم يتم استلام رمز الوصول من Google. يرجى المحاولة مرة أخرى.')}`
      );
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Google OAuth: Failed to fetch user info', {
        status: userResponse.status,
        statusText: userResponse.statusText,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=user_info_error&message=${encodeURIComponent('فشل الحصول على معلومات المستخدم من Google. يرجى المحاولة مرة أخرى.')}`
      );
    }

    const userData = await userResponse.json();

    if (!userData.email) {
      console.error('Google OAuth: No email in user data');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=user_info_error&message=${encodeURIComponent('لم يتم استلام البريد الإلكتروني من Google. يرجى التأكد من منح التطبيق صلاحية الوصول إلى البريد الإلكتروني.')}`
      );
    }

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    // If user doesn't exist, create a new one
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash: 'oauth_user', // OAuth users don't have a password
        },
      });
    }

    // Generate JWT token
    const token = await generateToken(user.id, user.email, user.name || undefined);

    // Get redirect path from cookie (set during OAuth initiation)
    const redirectPath = request.cookies.get('oauth_redirect')?.value || '/';
    
    // Validate redirect path (security measure)
    const safeRedirectPath = redirectPath.startsWith('/') && !redirectPath.startsWith('//') 
      ? redirectPath 
      : '/';

    // Create response with redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = NextResponse.redirect(
      `${baseUrl}${safeRedirectPath}`
    );

    // Set token in cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Clear state and redirect cookies
    response.cookies.set('oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('oauth_redirect', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    
    let errorMessage = 'حدث خطأ غير متوقع أثناء تسجيل الدخول بجوجل. يرجى المحاولة مرة أخرى.';
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = 'فشل الاتصال بخادم Google. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=server_error&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

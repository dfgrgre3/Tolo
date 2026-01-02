
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken, validateRedirectUri } from '@/lib/oauth';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import {
  isConnectionError,
  getSecureCookieOptions,
  logSecurityEventSafely,
  createOAuthErrorResponse,
  createOAuthErrorRedirect,
  OAUTH_ERROR_MESSAGES,
  withDatabaseRetry,
  getDatabaseErrorMessage
} from '@/app/api/auth/_helpers';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Handle errors from Google
      if (error) {
        logger.error('Google OAuth error:', error);

        // Use centralized error messages with special handling for invalid_request
        let errorMessage = OAUTH_ERROR_MESSAGES[error] || 'حدث خطأ أثناء تسجيل الدخول بجوجل';

        if (error === 'invalid_request') {
          const redirectUri = oauthConfig.google.redirectUri;
          errorMessage = `طلب غير صحيح. يرجى التحقق من:
1. Redirect URI يجب أن يكون بالضبط: ${redirectUri}
2. OAuth Consent Screen مكتمل
3. تثبت من إضافة بريدك في "Test users"`;
        }

        return createOAuthErrorResponse(error, errorMessage);
      }

      // Verify state parameter to prevent CSRF attacks
      const savedState = req.cookies.get('oauth_state')?.value;
      if (!state || !savedState || !verifyState(state, savedState)) {
        logger.error('Google OAuth: Invalid state parameter', { state, savedState });
        return createOAuthErrorResponse('invalid_state');
      }

      if (!code) {
        logger.error('Google OAuth: No authorization code received');
        return createOAuthErrorResponse('no_code');
      }

      // Validate OAuth configuration before making token request
      if (!oauthConfig.google.isConfigured()) {
        logger.error('Google OAuth: Missing credentials in callback');
        return createOAuthErrorResponse('oauth_not_configured', 'إعدادات OAuth غير مكتملة. يرجى التحقق من GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET.');
      }

      // Exchange authorization code for access token
      // redirect_uri must match EXACTLY what was sent in the initial auth request
      // This is the complete redirect URI stored in oauthConfig (e.g., http://localhost:3000/api/auth/google/callback)
      // Google OAuth requires exact match - any difference will cause failure
      const redirectUriForTokenExchange = oauthConfig.google.redirectUri;

      // Validate redirect URI before token exchange (helps catch configuration issues early)
      const redirectUriValidation = validateRedirectUri(redirectUriForTokenExchange);
      if (!redirectUriValidation.valid) {
        logger.error('Google OAuth callback: Invalid redirect URI format', {
          redirectUri: redirectUriForTokenExchange,
          error: redirectUriValidation.error,
          note: 'This redirect_uri will be sent to Google. It must match exactly what is configured in Google Cloud Console.',
        });
      } else {
        // Log the redirect_uri being used for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          logger.info('Google OAuth callback: Using redirect_uri for token exchange', {
            redirectUri: redirectUriForTokenExchange,
            note: 'This must match exactly the redirect_uri sent in the initial auth request and configured in Google Cloud Console',
          });
        }
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: oauthConfig.google.clientId,
          client_secret: oauthConfig.google.clientSecret,
          code,
          redirect_uri: redirectUriForTokenExchange, // Complete redirect URI from oauthConfig (must match exactly)
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error('Google OAuth token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText,
          redirectUri: redirectUriForTokenExchange,
          note: 'If error is "redirect_uri_mismatch", ensure the redirect_uri in Google Cloud Console matches exactly: ' + redirectUriForTokenExchange,
        });

        let errorMessage = `طلب غير صحيح. يرجى التحقق من:
        1. إعدادات Google OAuth في ملف.env.local
        2. تأكد من إضافة بريدك الإلكتروني في "Test users"
        3. تأكد من تطابق البروتوكول(http / https) والنطاق والمنفذ والمسار بالضبط`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error === 'invalid_grant') {
            errorMessage = `طلب غير صحيح. يرجى التحقق من:
            1. إعدادات Google OAuth في ملف.env.local
            2. تأكد من إضافة بريدك الإلكتروني في "Test users"
            3. تأكد من تطابق البروتوكول(http / https) والنطاق والمنفذ والمسار بالضبط`;
          } else if (errorData.error === 'invalid_client') {
            errorMessage = `طلب غير صحيح. يرجى التحقق من:
            1. إعدادات Google OAuth في ملف.env.local
            2. تأكد من إضافة بريدك الإلكتروني في "Test users"
            3. تأكد من تطابق البروتوكول(http / https) والنطاق والمنفذ والمسار بالضبط`;
          } else if (errorData.error === 'redirect_uri_mismatch') {
            // Special handling for redirect_uri mismatch - most common OAuth configuration error
            errorMessage = `عدم تطابق redirect_uri. يجب أن يكون العنوان في Google Cloud Console بالضبط:
${redirectUriForTokenExchange}

💡 خطوات الإصلاح:
1. افتح Google Cloud Console: https://console.cloud.google.com/
2. انتقل إلى: APIs & Services → Credentials
3. اختر OAuth 2.0 Client ID الخاص بك
4. تأكد من وجود هذا العنوان بالضبط في "Authorized redirect URIs":
   ${redirectUriForTokenExchange}
5. تأكد من تطابق البروتوكول (http / https) والنطاق والمنفذ والمسار بالضبط.`;


            logger.error('Google OAuth redirect_uri mismatch detected', {
              expectedRedirectUri: redirectUriForTokenExchange,
              errorFromGoogle: errorData.error_description || errorData.error,
            });
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
        logger.error('Google OAuth token error:', tokenData);
        let errorMessage = 'فشل الحصول على رمز الوصول من Google.';
        if (tokenData.error_description) {
          errorMessage = tokenData.error_description;
        }

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error&message=${encodeURIComponent(errorMessage)}`
        );
      }

      if (!tokenData.access_token) {
        logger.error('Google OAuth: No access token in response');
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
        logger.error('Google OAuth: Failed to fetch user info', {
          status: userResponse.status,
          statusText: userResponse.statusText,
        });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=user_info_error&message=${encodeURIComponent('فشل الحصول على معلومات المستخدم من Google. يرجى المحاولة مرة أخرى.')}`
        );
      }

      const userData = await userResponse.json();

      if (!userData.email) {
        logger.error('Google OAuth: No email in user data');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=user_info_error&message=${encodeURIComponent('لم يتم استلام البريد الإلكتروني من Google. يرجى التأكد من منح التطبيق صلاحية الوصول إلى البريد الإلكتروني.')}`
        );
      }

      // Normalize email
      const normalizedEmail = userData.email.toLowerCase().trim();

      // Check if user exists in our database with retry
      let user;
      try {
        user = await withDatabaseRetry(
          async () => prisma.user.findUnique({ where: { email: normalizedEmail } }),
          { maxAttempts: 5, operationName: 'find user by email' }
        );
      } catch (dbError: unknown) {
        logger.error('Database error while finding user:', dbError);
        return createOAuthErrorResponse('database_error', getDatabaseErrorMessage(dbError));
      }

      // If user doesn't exist, create a new one with retry
      if (!user) {
        try {
          // Generate unique user ID
          const userId = uuidv4();

          // Normalize name (handle null/undefined)
          const normalizedName = userData.name?.trim() || null;

          user = await withDatabaseRetry(async () => {
            return await prisma.user.create({
              data: {
                id: userId,
                email: normalizedEmail,
                name: normalizedName,
                passwordHash: uuidv4(), // Secure random "password" for OAuth users
                // Set required defaults
                emailVerified: true, // OAuth users are considered verified
                emailNotifications: true,
                smsNotifications: false,
                twoFactorEnabled: false,
                biometricEnabled: false,

                // Gamification defaults
                totalXP: 0,
                level: 1,
                currentStreak: 0,
                longestStreak: 0,
                totalStudyTime: 0,
                tasksCompleted: 0,
                examsPassed: 0,
                pomodoroSessions: 0,
                deepWorkSessions: 0,
                focusStrategy: 'POMODORO',
              },
            });
          }, { maxAttempts: 5, operationName: 'create new user' });

          logger.info('Google OAuth: Created new user', {
            id: user.id,
            email: user.email,
            name: user.name,
          });

          // Log security event for new user creation
          await logSecurityEventSafely(user.id, 'USER_REGISTER_OAUTH', {
            provider: 'google',
            email: user.email,
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
          });
        } catch (createError: unknown) {
          const errorMsg = createError instanceof Error ? createError.message : String(createError);
          const errorCode = createError instanceof Error && 'code' in createError ? (createError as { code: string }).code : undefined;
          const errorMeta = createError instanceof Error && 'meta' in createError ? (createError as { meta: unknown }).meta : undefined;
          const errorStack = createError instanceof Error ? createError.stack : undefined;

          logger.error('Database error while creating user:', {
            error: errorMsg,
            code: errorCode,
            meta: errorMeta,
            stack: errorStack,
          });

          // If user already exists (race condition or duplicate email), try to find them again
          if (errorCode === 'P2002') {
            logger.info('User already exists (race condition), finding user...');
            try {
              user = await withDatabaseRetry(
                async () => prisma.user.findUnique({ where: { email: normalizedEmail } }),
                { maxAttempts: 5, operationName: 'find user after duplicate error' }
              );

              if (!user) {
                logger.error('User not found after duplicate error');
                return createOAuthErrorResponse('database_error', 'فشل العثور على المستخدم. يرجى المحاولة مرة أخرى.');
              }

              logger.info('Google OAuth: Found existing user after race condition', {
                id: user.id,
                email: user.email,
              });
            } catch (findError: unknown) {
              logger.error('Error finding user after duplicate:', findError);
              return createOAuthErrorResponse('database_error', getDatabaseErrorMessage(findError));
            }
          } else {
            // Return detailed error for debugging
            let errorMessage = 'فشل إنشاء حساب جديد. يرجى المحاولة مرة أخرى.';

            if (isConnectionError(createError)) {
              errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
            } else if (errorCode === 'P1001') {
              errorMessage = 'لا يمكن الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.';
            } else if (errorCode === 'P1017') {
              errorMessage = 'تم إغلاق الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
            } else if ((createError as any).meta?.target) {
              errorMessage = `فشل إنشاء حساب: ${(createError as any).meta.target.join(', ')}`;
            } else if (errorMsg) {
              // In development, show more details
              if (process.env.NODE_ENV === 'development') {
                errorMessage = `فشل إنشاء حساب: ${errorMsg}`;
              }
            }

            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent(errorMessage)}`
            );
          }
        }
      }

      // Ensure user exists before proceeding
      if (!user) {
        logger.error('Google OAuth: User is null after all attempts');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent('فشل الحصول على معلومات المستخدم. يرجى المحاولة مرة أخرى.')}`
        );
      }

      // Generate JWT token
      const token = await generateToken(user.id, user.email, user.name || undefined);

      // Get redirect path from cookie (set during OAuth initiation)
      const redirectPath = req.cookies.get('oauth_redirect')?.value || '/';

      // Validate redirect path (security measure)
      const safeRedirectPath = redirectPath.startsWith('/') && !redirectPath.startsWith('//')
        ? redirectPath
        : '/';

      // Create response with redirect
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = NextResponse.redirect(
        `${baseUrl}${safeRedirectPath}`
      );

      // Security: Use centralized secure cookie settings
      // Set token in cookie - use access_token for consistency with login route
      response.cookies.set('access_token', token, {
        ...getSecureCookieOptions({ maxAge: 7 * 24 * 60 * 60 }), // 7 days
      });

      // Log security event for successful login
      await logSecurityEventSafely(user.id, 'USER_LOGIN_OAUTH', {
        provider: 'google',
        email: user.email,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });

      // Clear state and redirect cookies
      response.cookies.set('oauth_state', '', {
        ...getSecureCookieOptions({ maxAge: 0 }),
      });
      response.cookies.set('oauth_redirect', '', {
        ...getSecureCookieOptions({ maxAge: 0 }),
      });

      return response;
    } catch (error: unknown) {
      // Enhanced error logging
      const errorDetails = {
        error,
        errorType: typeof error,
        errorConstructor: error instanceof Error ? error.constructor.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
      };

      logger.error('Error in Google OAuth callback:', errorDetails);

      let errorMessage = 'حدث خطأ غير متوقع أثناء تسجيل الدخول بجوجل. يرجى المحاولة مرة أخرى.';
      let errorCode = 'server_error';

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        // Network errors
        if (errorMsg.includes('fetch') || errorMsg.includes('network') ||
          errorMsg.includes('econnrefused') || errorMsg.includes('enotfound') ||
          errorMsg.includes('etimedout') || errorMsg.includes('econnreset')) {
          errorMessage = 'فشل الاتصال بخادم Google. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
          errorCode = 'network_error';
        }
        // Database connection errors
        else if (isConnectionError(error) ||
          errorMsg.includes('database') ||
          errorMsg.includes('prisma') ||
          errorMsg.includes('p1001') ||
          errorMsg.includes('p1017') ||
          errorMsg.includes('p2002') ||
          errorMsg.includes('connection') ||
          errorMsg.includes('timeout')) {
          errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
          errorCode = 'database_error';

          // Try to ensure database is properly closed on error
          try {
            await prisma.$disconnect().catch(() => {
              // Ignore disconnect errors
            });
          } catch (disconnectError) {
            // Ignore disconnect errors
          }
        }
        // OAuth configuration errors
        else if (errorMsg.includes('oauth') || errorMsg.includes('client_id') ||
          errorMsg.includes('client_secret') || errorMsg.includes('secret')) {
          errorMessage = 'خطأ في إعدادات تسجيل الدخول. يرجى التواصل مع الدعم الفني.';
          errorCode = 'oauth_error';
        }
        // JWT/Token errors (check before timeout since jwt/token are more specific)
        else if ((errorMsg.includes('jwt') || errorMsg.includes('token')) && !errorMsg.includes('timeout')) {
          errorMessage = 'خطأ في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.';
          errorCode = 'token_error';
        }
        // Timeout errors (check after token to avoid conflicts)
        else if (errorMsg.includes('timeout')) {
          errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
          errorCode = 'timeout_error';
        }
        // Development mode - show more details
        else if (process.env.NODE_ENV === 'development') {
          errorMessage = `خطأ في التطوير: ${error.message}`;
        }
      } else if (error && typeof error === 'object') {
        // Handle object errors (Prisma errors, etc.)
        const errorObj = error as any;
        if (errorObj.code) {
          const prismaCode = String(errorObj.code);
          if (prismaCode.startsWith('P1')) {
            errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
            errorCode = 'database_error';
          } else if (prismaCode.startsWith('P2')) {
            errorMessage = 'حدث خطأ أثناء معالجة البيانات. يرجى المحاولة مرة أخرى.';
            errorCode = 'database_error';
          } else {
            errorCode = prismaCode.toLowerCase();
          }
        }

        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }

      // Ensure safe redirect URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const redirectUrl = `${baseUrl}/login?error=${encodeURIComponent(errorCode)}&message=${encodeURIComponent(errorMessage)}`;

      return NextResponse.redirect(redirectUrl);
    }
  });
}

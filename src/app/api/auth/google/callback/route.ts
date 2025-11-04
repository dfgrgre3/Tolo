
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { isConnectionError } from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Google
    if (error) {
      console.error('Google OAuth error:', error);
      console.error('Request URL:', request.url);
      console.error('OAuth Config:', {
        clientId: oauthConfig.google.clientId?.substring(0, 20) + '...',
        redirectUri: oauthConfig.google.redirectUri,
        isConfigured: oauthConfig.google.isConfigured(),
      });
      
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول بجوجل';
      
      // Map Google error codes to user-friendly Arabic messages
      const errorMessages: Record<string, string> = {
        'access_denied': 'تم إلغاء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        'invalid_request': 'طلب غير صحيح. يرجى التحقق من إعدادات Redirect URI في Google Console.',
        'unauthorized_client': 'تطبيق غير مصرح به. يرجى التحقق من client_id في Google Console.',
        'unsupported_response_type': 'نوع استجابة غير مدعوم. يرجى التواصل مع الدعم الفني.',
        'invalid_scope': 'نطاق غير صحيح. يرجى التواصل مع الدعم الفني.',
        'server_error': 'خطأ في خادم Google. يرجى المحاولة مرة أخرى لاحقاً.',
        'temporarily_unavailable': 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
      };
      
      // Special handling for invalid_request which often means redirect_uri mismatch
      if (error === 'invalid_request') {
        errorMessage = `طلب غير صحيح. يرجى التحقق من:
1. Redirect URI في Google Console يجب أن يكون: ${oauthConfig.google.redirectUri}
2. OAuth Consent Screen يجب أن يكون مكتملاً
3. إذا كان التطبيق في وضع الاختبار، تأكد من إضافة بريدك الإلكتروني في "Test users"`;
      }
      
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
    if (!oauthConfig.google.isConfigured()) {
      console.error('Google OAuth: Missing credentials in callback');
      const missingFields: string[] = [];
      if (!oauthConfig.google.clientId || oauthConfig.google.clientId.trim() === '') {
        missingFields.push('GOOGLE_CLIENT_ID');
      }
      if (!oauthConfig.google.clientSecret || oauthConfig.google.clientSecret.trim() === '') {
        missingFields.push('GOOGLE_CLIENT_SECRET');
      }
      
      const errorMessage = missingFields.length > 0
        ? `إعدادات Google OAuth غير مكتملة. المتغيرات المفقودة: ${missingFields.join(', ')}. يرجى إضافة هذه المتغيرات إلى ملف .env.local`
        : 'إعدادات Google OAuth غير مكتملة. يرجى التحقق من إعدادات الخادم.';
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // Exchange authorization code for access token
    // redirect_uri must match exactly what was sent in the initial auth request
    // This is the complete redirect URI stored in oauthConfig (e.g., http://localhost:3000/api/auth/google/callback)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: oauthConfig.google.clientId,
        client_secret: oauthConfig.google.clientSecret,
        code,
        redirect_uri: oauthConfig.google.redirectUri, // Complete redirect URI from oauthConfig
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

    // Normalize email
    const normalizedEmail = userData.email.toLowerCase().trim();
    
    // Helper function to ensure database connection with retry
    const ensureDatabaseConnection = async (maxRetries: number = 3): Promise<boolean> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Try to connect if not connected
          try {
            await prisma.$connect();
          } catch (connectError: any) {
            // If already connected, ignore the error
            if (!connectError.message?.includes('already connected')) {
              throw connectError;
            }
          }
          
          // Test the connection with a simple query
          await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 5000)
            )
          ]);
          
          return true;
        } catch (error: any) {
          console.warn(`Database connection check failed (attempt ${attempt}/${maxRetries}):`, {
            error: error.message,
            code: error.code,
          });
          
          if (attempt < maxRetries) {
            // Try to disconnect and reconnect
            try {
              await prisma.$disconnect();
            } catch (disconnectError) {
              // Ignore disconnect errors
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          } else {
            console.error('Failed to establish database connection after all retries');
            return false;
          }
        }
      }
      return false;
    };
    
    // Verify database connection before proceeding
    const isConnected = await ensureDatabaseConnection(3);
    if (!isConnected) {
      console.error('Database is not connected, cannot proceed with OAuth');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent('فشل الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.')}`
      );
    }
    
    // Helper function to retry database operations with better error handling
    const retryDatabaseOperation = async <T>(
      operation: () => Promise<T>,
      maxRetries: number = 5,
      retryDelay: number = 1000,
      operationName: string = 'database operation'
    ): Promise<T> => {
      let lastError: any;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Ensure connection before each retry
          if (attempt > 1) {
            const connected = await ensureDatabaseConnection(1);
            if (!connected) {
              throw new Error('Database connection lost');
            }
          }
          
          // Execute operation with timeout
          return await Promise.race([
            operation(),
            new Promise<T>((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), 10000)
            )
          ]);
        } catch (error: any) {
          lastError = error;
          
          // Check if error is retryable
          const isRetryable = isConnectionError(error) || 
                             error?.code === 'P1001' || // Prisma connection error
                             error?.code === 'P1017' || // Prisma server closed connection
                             error?.code === 'P2002' || // Prisma unique constraint (might be race condition)
                             error?.message?.includes('timeout') ||
                             error?.message?.includes('ECONNREFUSED') ||
                             error?.message?.includes('ETIMEDOUT') ||
                             error?.message?.includes('Connection lost') ||
                             error?.message?.includes('Connection closed');
          
          if (!isRetryable) {
            // Non-retryable error, throw immediately
            throw error;
          }
          
          if (attempt === maxRetries) {
            // Last attempt failed, throw error
            throw error;
          }
          
          console.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}), retrying...`, {
            error: error.message,
            code: error.code,
          });
          
          // Wait before retrying (exponential backoff with jitter)
          const delay = retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));
        }
      }
      throw lastError;
    };
    
    // Check if user exists in our database with retry
    let user;
    try {
      user = await retryDatabaseOperation(async () => {
        return await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
      }, 5, 1000, 'find user by email');
    } catch (dbError: any) {
      console.error('Database error while finding user:', {
        error: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack,
      });
      
      // Provide user-friendly error message
      let errorMessage = 'حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى.';
      
      if (isConnectionError(dbError)) {
        errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
      } else if (dbError.code === 'P1001') {
        errorMessage = 'لا يمكن الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.';
      } else if (dbError.code === 'P1017') {
        errorMessage = 'تم إغلاق الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
      } else if (dbError.message?.includes('timeout')) {
        errorMessage = 'انتهت مهلة الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // If user doesn't exist, create a new one with retry
    if (!user) {
      try {
        // Generate unique user ID
        const userId = uuidv4();
        
        // Normalize name (handle null/undefined)
        const normalizedName = userData.name?.trim() || null;
        
        user = await retryDatabaseOperation(async () => {
          return await prisma.user.create({
            data: {
              id: userId,
              email: normalizedEmail,
              name: normalizedName,
              passwordHash: 'oauth_user', // OAuth users don't have a password
              // Set required defaults
              emailVerified: true, // OAuth users are considered verified
              emailNotifications: true,
              smsNotifications: false,
              twoFactorEnabled: false,
              biometricEnabled: false,
              biometricCredentials: [], // JSON array - will be converted to Json type
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
        }, 5, 1000, 'create new user');
        
        console.log('Google OAuth: Created new user', {
          id: user.id,
          email: user.email,
          name: user.name,
        });
      } catch (createError: any) {
        console.error('Database error while creating user:', {
          error: createError.message,
          code: createError.code,
          meta: createError.meta,
          stack: createError.stack,
        });
        
        // If user already exists (race condition or duplicate email), try to find them again
        if (createError.code === 'P2002') {
          console.log('User already exists (race condition), finding user...');
            try {
            user = await retryDatabaseOperation(async () => {
              return await prisma.user.findUnique({
                where: { email: normalizedEmail },
              });
            }, 5, 1000, 'find user after duplicate error');
            
            if (!user) {
              console.error('User not found after duplicate error');
              return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent('فشل العثور على المستخدم. يرجى المحاولة مرة أخرى.')}`
              );
            }
            
            console.log('Google OAuth: Found existing user after race condition', {
              id: user.id,
              email: user.email,
            });
          } catch (findError: any) {
            console.error('Error finding user after duplicate:', {
              error: findError.message,
              code: findError.code,
              meta: findError.meta,
            });
            
            let errorMessage = 'فشل العثور على المستخدم. يرجى المحاولة مرة أخرى.';
            if (isConnectionError(findError)) {
              errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
            }
            
            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent(errorMessage)}`
            );
          }
        } else {
          // Return detailed error for debugging
          let errorMessage = 'فشل إنشاء حساب جديد. يرجى المحاولة مرة أخرى.';
          
          if (isConnectionError(createError)) {
            errorMessage = 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
          } else if (createError.code === 'P1001') {
            errorMessage = 'لا يمكن الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.';
          } else if (createError.code === 'P1017') {
            errorMessage = 'تم إغلاق الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
          } else if (createError.meta?.target) {
            errorMessage = `فشل إنشاء حساب: ${createError.meta.target.join(', ')}`;
          } else if (createError.message) {
            // In development, show more details
            if (process.env.NODE_ENV === 'development') {
              errorMessage = `فشل إنشاء حساب: ${createError.message}`;
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
      console.error('Google OAuth: User is null after all attempts');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent('فشل الحصول على معلومات المستخدم. يرجى المحاولة مرة أخرى.')}`
      );
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
    
    console.error('Error in Google OAuth callback:', errorDetails);
    
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
               errorMsg.includes('client_secret') || errorMsg.includes('jwt') ||
               errorMsg.includes('secret')) {
        errorMessage = 'خطأ في إعدادات تسجيل الدخول. يرجى التواصل مع الدعم الفني.';
        errorCode = 'oauth_error';
      }
      // Timeout errors
      else if (errorMsg.includes('timeout')) {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
        errorCode = 'timeout_error';
      }
      // JWT/Token errors
      else if (errorMsg.includes('jwt') || errorMsg.includes('token')) {
        errorMessage = 'خطأ في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.';
        errorCode = 'token_error';
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
}

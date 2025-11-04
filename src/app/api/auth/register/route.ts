import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { RegisterRequest, RegisterResponse, RegisterErrorResponse } from '@/types/api/auth';

const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('البريد الإلكتروني غير صالح')
    .max(255, 'البريد الإلكتروني طويل جداً'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً')
    .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
    .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
    .regex(/[^A-Za-z0-9]/, 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل'),
  name: z
    .string()
    .min(1, 'الاسم مطلوب')
    .max(100, 'الاسم طويل جداً')
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, 'الاسم يجب أن يحتوي على أحرف فقط')
    .optional(),
});

export async function POST(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errorResponse: RegisterErrorResponse = {
        error: 'تعذر معالجة البيانات المدخلة.',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name?.trim() || null;

    // Additional email validation
    if (!normalizedEmail || normalizedEmail.length < 5) {
      const errorResponse: RegisterErrorResponse = {
        error: 'البريد الإلكتروني غير صالح.',
        code: 'INVALID_EMAIL',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await authService.findUserByEmail(normalizedEmail);

    if (existingUser) {
      const errorResponse: RegisterErrorResponse = {
        error: 'البريد الإلكتروني مستخدم بالفعل.',
        code: 'USER_EXISTS',
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // Hash password with proper error handling
    let passwordHash: string;
    try {
      passwordHash = await AuthService.hashPassword(password);
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء معالجة كلمة المرور. حاول مرة أخرى.',
          code: 'HASH_ERROR',
        },
        { status: 500 }
      );
    }

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate unique user ID
    const userId = uuidv4();

    // Create new user with all required fields and defaults
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          passwordHash,
          name: normalizedName,
          emailVerificationToken,
          emailVerificationExpires,
          emailVerified: false, // Explicitly set to false
          emailNotifications: true, // Default to true
          smsNotifications: false, // Default to false
          twoFactorEnabled: false, // Default to false
          biometricEnabled: false, // Default to false
          biometricCredentials: [], // Default empty array
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
          // Focus strategy default
          focusStrategy: 'POMODORO',
        },
      });
    } catch (dbError: any) {
      console.error('Database error during registration:', dbError);
      
      // Handle unique constraint violation
      if (dbError.code === 'P2002' || dbError.message?.includes('unique')) {
        return NextResponse.json(
          {
            error: 'البريد الإلكتروني مستخدم بالفعل.',
            code: 'USER_EXISTS',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى لاحقاً.',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    // Verify user was created successfully
    if (!newUser || !newUser.id) {
      return NextResponse.json(
        {
          error: 'فشل إنشاء الحساب. حاول مرة أخرى.',
          code: 'CREATION_FAILED',
        },
        { status: 500 }
      );
    }

    // Log security event
    try {
      await authService.logSecurityEvent(newUser.id, 'register_success', ip, {
        userAgent,
      });
    } catch (logError) {
      // Don't fail registration if logging fails, but log it
      console.error('Failed to log security event:', logError);
    }

    // Generate verification link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/verify-email?token=${emailVerificationToken}`;

    // Verify user was created in database by fetching it again
    try {
      const verifiedUser = await prisma.user.findUnique({
        where: { id: newUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
          role: true,
        },
      });

      if (!verifiedUser) {
        console.error('User was not found in database after creation');
        return NextResponse.json(
          {
            error: 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.',
            code: 'VERIFICATION_FAILED',
          },
          { status: 500 }
        );
      }

      // Return user data without sensitive information
      const registerResponse: RegisterResponse = {
        success: true,
        message: 'تم إنشاء الحساب بنجاح!',
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          name: verifiedUser.name || undefined,
          emailVerified: verifiedUser.emailVerified || false,
          role: verifiedUser.role || 'user',
          createdAt: verifiedUser.createdAt,
        },
        verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
        requiresEmailVerification: true,
      };
      return NextResponse.json(registerResponse, { status: 201 });
    } catch (verifyError: any) {
      console.error('Error verifying user creation:', verifyError);
      // Even if verification fails, user was created, so return success
      // but log the error for investigation
      return NextResponse.json(
        {
          success: true,
          message: 'تم إنشاء الحساب بنجاح!',
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            emailVerified: newUser.emailVerified || false,
            role: (newUser as any).role || 'user',
            createdAt: newUser.createdAt,
          },
          verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
          requiresEmailVerification: true,
          warning: 'تم إنشاء الحساب ولكن حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى.',
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Try to log security event
    try {
      await authService.logSecurityEvent(null, 'register_error', ip, {
        userAgent,
        error: error?.message || 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    // Determine if it's a connection/database error
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack || '';
    const fullError = `${errorMessage} ${errorStack}`.toLowerCase();
    
    const isConnectionError = 
      fullError.includes('connect') ||
      fullError.includes('econnrefused') ||
      fullError.includes('etimedout') ||
      fullError.includes('database') ||
      fullError.includes('prisma') ||
      fullError.includes('timeout') ||
      fullError.includes('p1001') || // Prisma connection error
      fullError.includes('p1017') || // Prisma server closed connection
      fullError.includes('p2002') || // Prisma unique constraint
      fullError.includes('enotfound') ||
      fullError.includes('econnreset') ||
      fullError.includes('networkerror') ||
      fullError.includes('failed to fetch') ||
      fullError.includes('fetch error') ||
      fullError.includes('cannot read properties') ||
      fullError.includes('undefined');

    // Determine error code
    let errorCode = 'INTERNAL_ERROR';
    if (isConnectionError) {
      errorCode = 'CONNECTION_ERROR';
    } else if (fullError.includes('validation') || fullError.includes('invalid')) {
      errorCode = 'VALIDATION_ERROR';
    } else if (fullError.includes('rate limit') || fullError.includes('too many')) {
      errorCode = 'RATE_LIMIT_ERROR';
    }

    // Return appropriate error message
    const userFriendlyMessage = isConnectionError
      ? 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.'
      : errorMessage || 'حدث خطأ غير متوقع أثناء التسجيل. حاول مرة أخرى لاحقاً.';
    
    return NextResponse.json(
      {
        error: userFriendlyMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
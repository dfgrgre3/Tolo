import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import type { RegisterResponse } from '@/types/api/auth';
import { 
  createStandardErrorResponse,
  createSuccessResponse,
  isConnectionError,
  parseRequestBody,
  extractRequestMetadata,
  logSecurityEventSafely
} from '@/app/api/auth/_helpers';

import { logger } from '@/lib/logger';
import { emailService } from '@/lib/services/email-service';

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
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      // Parse and validate request body using standardized helper
      const bodyResult = await parseRequestBody<{
        email?: string;
        password?: string;
        name?: string;
      }>(req, {
        maxSize: 2048, // 2KB max for registration
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const parsed = registerSchema.safeParse(bodyResult.data);

    if (!parsed.success) {
      return createStandardErrorResponse(
        {
          error: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
        'تعذر معالجة البيانات المدخلة.',
        400
      );
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name?.trim() || null;

    // Additional email validation
    if (!normalizedEmail || normalizedEmail.length < 5) {
      return createStandardErrorResponse(
        new Error('INVALID_EMAIL'),
        'البريد الإلكتروني غير صالح.',
        400
      );
    }

    // Check if user already exists
    const existingUser = await authService.findUserByEmail(normalizedEmail);

    if (existingUser) {
      return createStandardErrorResponse(
        new Error('USER_EXISTS'),
        'البريد الإلكتروني مستخدم بالفعل.',
        409
      );
    }

    // Hash password with proper error handling
    let passwordHash: string;
    try {
      passwordHash = await AuthService.hashPassword(password);
    } catch (hashError) {
      logger.error('Password hashing error:', hashError);
      return createStandardErrorResponse(
        hashError,
        'حدث خطأ أثناء معالجة كلمة المرور. حاول مرة أخرى.',
        500
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
      logger.error('Database error during registration:', dbError);
      
      // Handle unique constraint violation
      if (dbError.code === 'P2002' || dbError.message?.includes('unique')) {
        return createStandardErrorResponse(
          new Error('USER_EXISTS'),
          'البريد الإلكتروني مستخدم بالفعل.',
          409
        );
      }

      return createStandardErrorResponse(
        dbError,
        'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى لاحقاً.',
        500
      );
    }

    // Verify user was created successfully
    if (!newUser || !newUser.id) {
      return createStandardErrorResponse(
        new Error('CREATION_FAILED'),
        'فشل إنشاء الحساب. حاول مرة أخرى.',
        500
      );
    }

    // Log security event
    await logSecurityEventSafely(newUser.id, 'register_success', {
      ip,
      userAgent,
    });

    // Generate verification link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/verify-email?token=${emailVerificationToken}`;

    // Send verification email
    // We do this asynchronously (without awaiting) to speed up the response, 
    // or we can await it to ensure delivery. For reliability, we await it here.
    try {
      await emailService.sendVerificationEmail(normalizedEmail, emailVerificationToken);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Continue execution - user can request resend later
    }

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
          twoFactorEnabled: true,
        },
      });

      if (!verifiedUser) {
        logger.error('User was not found in database after creation');
        return createStandardErrorResponse(
          new Error('VERIFICATION_FAILED'),
          'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.',
          500
        );
      }

      // Return user data without sensitive information
      return createSuccessResponse<RegisterResponse>({
        success: true,
        message: 'تم إنشاء الحساب بنجاح!',
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          name: verifiedUser.name || undefined,
          emailVerified: verifiedUser.emailVerified || false,
          twoFactorEnabled: verifiedUser.twoFactorEnabled || false,
          role: verifiedUser.role || 'user',
          createdAt: verifiedUser.createdAt,
        },
        verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
        requiresEmailVerification: true,
      }, undefined, 201);
    } catch (verifyError: any) {
      logger.error('Error verifying user creation:', verifyError);
      // Even if verification fails, user was created, so return success
      // but log the error for investigation
      return createSuccessResponse<RegisterResponse>({
        success: true,
        message: 'تم إنشاء الحساب بنجاح!',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          emailVerified: newUser.emailVerified || false,
          twoFactorEnabled: newUser.twoFactorEnabled || false,
          role: (newUser as any).role || 'user',
          createdAt: newUser.createdAt,
        },
        verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
        requiresEmailVerification: true,
        warning: 'تم إنشاء الحساب ولكن حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى.',
      }, undefined, 201);
    }
  } catch (error: any) {
    logger.error('Registration error:', error);
    
    // Log security event safely
    await logSecurityEventSafely(null, 'register_error', {
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return appropriate error response
    return createStandardErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء التسجيل. حاول مرة أخرى لاحقاً.'
    );
  }
  });
}
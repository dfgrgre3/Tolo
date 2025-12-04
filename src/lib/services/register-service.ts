import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { emailService } from '@/lib/services/email-service';
import { registerSchema } from '@/lib/auth/schemas';
import type { RegisterResponse } from '@/types/api/auth';
import {
    logSecurityEventSafely
} from '@/app/api/auth/_helpers';

export interface RegisterResult {
    success: boolean;
    response: RegisterResponse | { error: string; code: string; details?: any };
    statusCode: number;
}

export class RegisterService {
    /**
     * Handle user registration
     */
    static async register(
        data: z.infer<typeof registerSchema>,
        ip: string,
        userAgent: string
    ): Promise<RegisterResult> {
        try {
            const { email, password, name } = data;
            const normalizedEmail = email.trim().toLowerCase();
            const normalizedName = name?.trim() || null;

            // Additional email validation
            if (!normalizedEmail || normalizedEmail.length < 5) {
                return {
                    success: false,
                    response: {
                        error: 'البريد الإلكتروني غير صالح.',
                        code: 'INVALID_EMAIL',
                    },
                    statusCode: 400,
                };
            }

            // Check if user already exists
            const existingUser = await authService.findUserByEmail(normalizedEmail);

            if (existingUser) {
                return {
                    success: false,
                    response: {
                        error: 'البريد الإلكتروني مستخدم بالفعل.',
                        code: 'USER_EXISTS',
                    },
                    statusCode: 409,
                };
            }

            // Hash password
            let passwordHash: string;
            try {
                passwordHash = await AuthService.hashPassword(password);
            } catch (hashError) {
                logger.error('Password hashing error:', hashError);
                return {
                    success: false,
                    response: {
                        error: 'حدث خطأ أثناء معالجة كلمة المرور. حاول مرة أخرى.',
                        code: 'PASSWORD_HASH_ERROR',
                    },
                    statusCode: 500,
                };
            }

            // Generate email verification token
            const emailVerificationToken = randomBytes(32).toString('hex');
            const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Generate unique user ID
            const userId = uuidv4();

            // Create new user
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
                        emailVerified: false,
                        emailNotifications: true,
                        smsNotifications: false,
                        twoFactorEnabled: false,
                        biometricEnabled: false,
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
            } catch (dbError: unknown) {
                logger.error('Database error during registration:', dbError);

                const isUniqueConstraintError =
                    (dbError && typeof dbError === 'object' && 'code' in dbError && (dbError as any).code === 'P2002') ||
                    (dbError instanceof Error && dbError.message?.includes('unique'));

                if (isUniqueConstraintError) {
                    return {
                        success: false,
                        response: {
                            error: 'البريد الإلكتروني مستخدم بالفعل.',
                            code: 'USER_EXISTS',
                        },
                        statusCode: 409,
                    };
                }

                return {
                    success: false,
                    response: {
                        error: 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى لاحقاً.',
                        code: 'DB_ERROR',
                    },
                    statusCode: 500,
                };
            }

            if (!newUser || !newUser.id) {
                return {
                    success: false,
                    response: {
                        error: 'فشل إنشاء الحساب. حاول مرة أخرى.',
                        code: 'CREATION_FAILED',
                    },
                    statusCode: 500,
                };
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
            try {
                await emailService.sendVerificationEmail(normalizedEmail, emailVerificationToken);
            } catch (emailError) {
                logger.error('Failed to send verification email:', emailError);
            }

            // Verify user was created in database
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
                    return {
                        success: false,
                        response: {
                            error: 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.',
                            code: 'VERIFICATION_FAILED',
                        },
                        statusCode: 500,
                    };
                }

                return {
                    success: true,
                    response: {
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
                    },
                    statusCode: 201,
                };
            } catch (verifyError: unknown) {
                logger.error('Error verifying user creation:', verifyError);
                // Return success even if verification fails, but with warning
                return {
                    success: true,
                    response: {
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
                    },
                    statusCode: 201,
                };
            }
        } catch (error: unknown) {
            logger.error('Registration error:', error);
            return {
                success: false,
                response: {
                    error: 'حدث خطأ غير متوقع أثناء التسجيل. حاول مرة أخرى لاحقاً.',
                    code: 'INTERNAL_ERROR',
                },
                statusCode: 500,
            };
        }
    }
}

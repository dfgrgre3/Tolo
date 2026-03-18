import prisma from '@/lib/db';
import { PasswordService } from './password-service';
import { SessionService } from './session-service';
import { SecurityLogger, SecurityEventType } from './security-logger';
import { TwoFactorService } from './two-factor-service';
import { logger } from '@/lib/logger';
import { randomBytes, createHash } from 'crypto';
import { emailService } from '@/lib/services/email-service';

/**
 * AuthService - Central authentication business logic layer.
 * 
 * Architectural Decision:
 * This service encapsulates ALL authentication logic, separating it from
 * API route handlers (Controllers). This follows Clean Architecture principles:
 * 
 * Route Handler (Controller) → AuthService (Use Case) → Prisma (Repository)
 * 
 * Benefits:
 * - Testable: Can be unit tested without HTTP concerns
 * - Reusable: Same logic works for API routes, middleware, SSR
 * - Secure: Single point for security policy enforcement
 */

export interface LoginInput {
    email: string;
    password: string;
    rememberMe?: boolean;
    ip: string;
    userAgent: string;
}

export interface RegisterInput {
    email: string;
    username?: string;
    password: string;
    role?: string;
    ip: string;
    userAgent: string;
    country?: string;
    dateOfBirth?: Date | null;
    gender?: string;
    phone?: string;
    alternativePhone?: string;
    gradeLevel?: string;
    educationType?: string;
    section?: string;
    interestedSubjects?: string[];
    studyGoal?: string;
    subjectsTaught?: string[];
    classesTaught?: string[];
    experienceYears?: string;
}

export interface AuthResult {
    success: boolean;
    user?: {
        id: string;
        email: string;
        username: string | null;
        name?: string | null;
        role: string;
        avatar: string | null;
        emailVerified: boolean | null;
        twoFactorEnabled?: boolean;
    };
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string;
    requires2FA?: boolean;
    tempToken?: string;
    error?: string;
    statusCode?: number;
}

// Constant bcrypt hash used for timing-safe comparison when user is not found.
const DUMMY_PASSWORD_HASH = '$2a$12$RYM9CZPUKMeXAHOD01E4QeSjQIvT0.Q.rZEDkHXY/r8ok6sY4M1Ki';

export class AuthService {
    /**
     * Authenticate a user with email and password.
     * 
     * Security measures applied:
     * 1. Generic error messages to prevent user enumeration
     * 2. Constant-time password comparison (bcrypt handles this)
     * 3. Session creation with device tracking
     * 4. Security event logging
     */
    static async login(input: LoginInput & { location?: string }): Promise<AuthResult> {
        const { email, password, rememberMe = false, ip, userAgent, location } = input;
        const normalizedEmail = email.toLowerCase().trim();

        try {
            if (password.length > 256) {
                await SecurityLogger.logFailedLogin(ip, userAgent, 'PASSWORD_TOO_LONG');
                return {
                    success: false,
                    error: 'Invalid email or password',
                    statusCode: 401,
                };
            }

            // 1. Find user by email
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    name: true,
                    passwordHash: true,
                    role: true,
                    avatar: true,
                    emailVerified: true,
                    twoFactorEnabled: true,
                },
            });

            if (!user) {
                // Run a timing-safe password comparison even when user is missing
                // to make enumeration attacks harder.
                await PasswordService.compare(password, DUMMY_PASSWORD_HASH);

                // Log failed attempt (without exposing email in logs)
                await SecurityLogger.logFailedLogin(ip, userAgent, 'USER_NOT_FOUND');
                return {
                    success: false,
                    error: 'Invalid email or password',
                    statusCode: 401,
                };
            }

            // 2. Verify password (bcrypt constant-time comparison)
            const isValidPassword = await PasswordService.compare(password, user.passwordHash);

            if (!isValidPassword) {
                await SecurityLogger.logFailedLogin(ip, userAgent, 'INVALID_PASSWORD');
                return {
                    success: false,
                    error: 'Invalid email or password',
                    statusCode: 401,
                };
            }

            // 3. Check for 2FA
            if (user.twoFactorEnabled) {
                // Generate a temporary restricted token for 2FA verification phase
                const tempToken = await PasswordService.hash(user.id + Date.now()); // Simple temp identifier
                return {
                    success: true,
                    requires2FA: true,
                    tempToken,
                    user: {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        name: user.name,
                        role: user.role,
                        avatar: user.avatar,
                        emailVerified: user.emailVerified,
                        twoFactorEnabled: user.twoFactorEnabled,
                    }
                };
            }

            // 4. Optional: Check email verification
            // Uncomment for production when email service is ready
            // if (!user.emailVerified) {
            //     return {
            //         success: false,
            //         error: 'Please verify your email address before logging in.',
            //         statusCode: 403,
            //     };
            // }

            // 5. Create session and generate tokens
            const { session, accessToken, refreshToken } = await SessionService.createSession(
                user.id,
                user.role,
                ip,
                userAgent,
                rememberMe,
                location
            );

            // 5. Update last login timestamp
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });

            // 6. Log successful login
            await SecurityLogger.logLogin(user.id, ip, userAgent, session.id);

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    emailVerified: user.emailVerified,
                },
                accessToken,
                refreshToken,
                sessionId: session.id,
            };
        } catch (error) {
            logger.error('[AUTH_LOGIN_ERROR]', { error });
            return {
                success: false,
                error: 'Internal server error',
                statusCode: 500,
            };
        }
    }

    /**
     * Verify 2FA token and complete login.
     */
    static async verify2FA(userId: string, token: string, ip: string, userAgent: string, rememberMe: boolean = false): Promise<AuthResult> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    name: true,
                    role: true,
                    avatar: true,
                    emailVerified: true,
                    twoFactorSecret: true,
                },
            });

            if (!user || !user.twoFactorSecret) {
                return { success: false, error: 'User not found or 2FA not enabled', statusCode: 404 };
            }

            const isValid = TwoFactorService.verifyToken(token, user.twoFactorSecret);

            if (!isValid) {
                await SecurityLogger.logFailedLogin(ip, userAgent, 'INVALID_2FA_TOKEN');
                return { success: false, error: 'Invalid 2FA token', statusCode: 401 };
            }

            // Complete login
            const { session, accessToken, refreshToken } = await SessionService.createSession(
                user.id,
                user.role,
                ip,
                userAgent,
                rememberMe
            );

            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });

            await SecurityLogger.logLogin(user.id, ip, userAgent, session.id);

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    emailVerified: user.emailVerified,
                },
                accessToken,
                refreshToken,
                sessionId: session.id,
            };
        } catch (error) {
            logger.error('[AUTH_2FA_VERIFY_ERROR]', { error });
            return { success: false, error: 'Internal server error', statusCode: 500 };
        }
    }

    /**
     * Register a new user account.
     * 
     * Security measures:
     * 1. Password strength validation
     * 2. Duplicate email check with ambiguous response
     * 3. Email verification token generation
     * 4. Security event logging
     */
    static async register(input: RegisterInput & { location?: string }): Promise<AuthResult> {
        const {
            email, username, password, role = 'STUDENT', ip, userAgent, location,
            country, dateOfBirth, gender, phone, alternativePhone,
            gradeLevel, educationType, section, interestedSubjects = [], studyGoal,
            subjectsTaught = [], classesTaught = [], experienceYears
        } = input;

        try {
            const normalizedEmail = email.toLowerCase().trim();

            // 1. Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (existingUser) {
                // Return ambiguous response to prevent email enumeration
                return {
                    success: true, // Intentionally true for security
                    statusCode: 200,
                };
            }

            // 2. Hash password with bcrypt (12 salt rounds)
            const passwordHash = await PasswordService.hash(password);

            // 3. Generate email verification token
            const verifyToken = randomBytes(32).toString('hex');
            const verifyTokenHash = createHash('sha256').update(verifyToken).digest('hex');
            const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // 4. Create user
            const user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    username: username || normalizedEmail.split('@')[0],
                    passwordHash,
                    emailVerificationToken: verifyTokenHash,
                    emailVerificationExpires: verifyExpires,
                    emailVerified: false,
                    role: role && role !== 'STUDENT' ? (role as any) : undefined,
                    country,
                    dateOfBirth,
                    gender,
                    phone,
                    alternativePhone,
                    gradeLevel,
                    educationType,
                    section,
                    interestedSubjects,
                    studyGoal,
                    subjectsTaught,
                    classesTaught,
                    experienceYears
                },
            });

            // 5. Log registration event
            await SecurityLogger.log({
                userId: user.id,
                eventType: SecurityEventType.REGISTER,
                ip,
                userAgent,
            });

            // 6. Send verification email
            await emailService.sendVerificationEmail(normalizedEmail, verifyToken);

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.username || normalizedEmail.split('@')[0],
                    role: user.role,
                    avatar: user.avatar,
                    emailVerified: user.emailVerified,
                },
                statusCode: 201,
            };
        } catch (error) {
            logger.error('[AUTH_REGISTER_ERROR]', { error });
            return {
                success: false,
                error: 'Internal server error',
                statusCode: 500,
            };
        }
    }


    /**
     * Verify a user's email address using the verification token.
     */
    static async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Hash the provided token to compare with stored hash
            const tokenHash = createHash('sha256').update(token).digest('hex');

            const user = await prisma.user.findFirst({
                where: {
                    emailVerificationToken: tokenHash,
                    emailVerificationExpires: { gt: new Date() },
                },
            });

            if (!user) {
                return { success: false, error: 'Invalid or expired verification token' };
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    emailVerificationToken: null,
                    emailVerificationExpires: null,
                },
            });

            // Log email verification
            await SecurityLogger.log({
                userId: user.id,
                eventType: SecurityEventType.EMAIL_VERIFIED,
                ip: 'SYSTEM', // Context missing here, but usually called from API
                userAgent: 'SYSTEM',
            });

            return { success: true };
        } catch (error) {
            logger.error('[AUTH_VERIFY_EMAIL_ERROR]', { error });
            return { success: false, error: 'Internal server error' };
        }
    }

    /**
     * Initiate password reset flow.
     */
    static async forgotPassword(email: string, ip: string, userAgent: string): Promise<{ success: boolean }> {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (!user) {
                // Ambiguous response for security (prevent enumeration)
                return { success: true };
            }

            // Generate reset token
            const resetToken = randomBytes(32).toString('hex');
            const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
            const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken: resetTokenHash,
                    resetTokenExpires: resetExpires,
                },
            });

            await SecurityLogger.log({
                userId: user.id,
                eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
                ip,
                userAgent,
            });

            // 4. Send password reset email
            await emailService.sendPasswordResetLink(normalizedEmail, resetToken);
            logger.info('[PASSWORD_RESET_LINK_SENT]', { email: normalizedEmail });

            return { success: true };
        } catch (error) {
            logger.error('[AUTH_FORGOT_PASSWORD_ERROR]', { error });
            return { success: true }; // Still return success to prevent timing attacks/enumeration
        }
    }

    /**
     * Complete password reset flow.
     */
    static async resetPassword(token: string, newPassword: string, ip: string, userAgent: string): Promise<{ success: boolean; error?: string }> {
        try {
            const tokenHash = createHash('sha256').update(token).digest('hex');

            const user = await prisma.user.findFirst({
                where: {
                    resetToken: tokenHash,
                    resetTokenExpires: { gt: new Date() },
                },
            });

            if (!user) {
                return { success: false, error: 'Invalid or expired reset token' };
            }

            // Hash new password
            const passwordHash = await PasswordService.hash(newPassword);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash,
                    resetToken: null,
                    resetTokenExpires: null,
                    passwordChangedAt: new Date(),
                },
            });

            // Invalidate all existing sessions for this user for security
            await SessionService.revokeAllSessions(user.id);

            await SecurityLogger.log({
                userId: user.id,
                eventType: SecurityEventType.PASSWORD_RESET_COMPLETE,
                ip,
                userAgent,
            });

            return { success: true };
        } catch (error) {
            logger.error('[AUTH_RESET_PASSWORD_ERROR]', { error });
            return { success: false, error: 'Internal server error' };
        }
    }

    /**
     * Resend verification email.
     */
    static async resendVerification(email: string, _ip: string, _userAgent: string): Promise<{ success: boolean; error?: string }> {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (!user || user.emailVerified) {
                return { success: true }; // Ambiguous
            }

            // Generate new token
            const verifyToken = randomBytes(32).toString('hex');
            const verifyTokenHash = createHash('sha256').update(verifyToken).digest('hex');
            const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerificationToken: verifyTokenHash,
                    emailVerificationExpires: verifyExpires,
                },
            });

            // 4. Send verification email
            await emailService.sendVerificationEmail(normalizedEmail, verifyToken);

            return { success: true };
        } catch (error) {
            logger.error('[AUTH_RESEND_VERIFICATION_ERROR]', { error });
            return { success: true };
        }
    }

    /**
     * Get current user profile from database.
     */
    static async getCurrentUser(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                avatar: true,
                role: true,
                emailVerified: true,
                phone: true,
                createdAt: true,
                lastLogin: true,
                totalXP: true,
                level: true,
                currentStreak: true,
            },
        });
    }

    /**
     * Update user profile information.
     */
    static async updateProfile(userId: string, data: {
        name?: string;
        username?: string;
        phone?: string;
        avatar?: string;
        bio?: string;
        school?: string;
        grade?: string;
        gradeLevel?: string;
        city?: string;
        birthDate?: string;
        dateOfBirth?: Date;
        gender?: string;
        country?: string;
        alternativePhone?: string;
        educationType?: string;
        section?: string;
        studyGoal?: string;
    }) {
        try {
            const updateData: any = {
                name: data.name,
                username: data.username,
                phone: data.phone,
                avatar: data.avatar,
                bio: data.bio,
                school: data.school,
                gradeLevel: data.gradeLevel || data.grade,
                city: data.city,
                gender: data.gender,
                country: data.country,
                alternativePhone: data.alternativePhone,
                educationType: data.educationType,
                section: data.section,
                studyGoal: data.studyGoal,
            };

            // Handle birthDate/dateOfBirth
            if (data.dateOfBirth) {
                updateData.dateOfBirth = data.dateOfBirth;
            } else if (data.birthDate) {
                updateData.dateOfBirth = new Date(data.birthDate);
            }

            return await prisma.user.update({
                where: { id: userId },
                data: updateData,
            });
        } catch (error) {
            logger.error('[AUTH_UPDATE_PROFILE_ERROR]', { error });
            throw error;
        }
    }

    /**
     * Change user password after validating current password.
     */
    static async changePassword(userId: string, currentPassword: string, newPassword: string, ip: string, userAgent: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { passwordHash: true }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValid = await PasswordService.compare(currentPassword, user.passwordHash) as boolean;
            if (!isValid) {
                await SecurityLogger.log({
                    userId,
                    eventType: SecurityEventType.PASSWORD_CHANGE,
                    ip,
                    userAgent,
                    metadata: { reason: 'INVALID_CURRENT_PASSWORD', success: false }
                });
                throw new Error('كلمة المرور الحالية غير صحيحة');
            }

            // Hash and update new password
            const newPasswordHash = await PasswordService.hash(newPassword);
            await prisma.user.update({
                where: { id: userId },
                data: {
                    passwordHash: newPasswordHash,
                    passwordChangedAt: new Date()
                }
            });

            // Log success
            await SecurityLogger.log({
                userId,
                eventType: SecurityEventType.PASSWORD_CHANGE,
                ip,
                userAgent,
                metadata: { success: true }
            });

            return { success: true };
        } catch (error: any) {
            logger.error('[AUTH_CHANGE_PASSWORD_ERROR]', { error });
            throw error;
        }
    }

    /**
     * Request a passwordless Magic Link.
     */
    static async requestMagicLink(email: string, ip: string, userAgent: string): Promise<{ success: boolean; error?: string }> {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
                select: { id: true, email: true }
            });

            if (!user) {
                // Return success anyway to prevent email enumeration
                return { success: true };
            }

            // Generate secure token
            const magicToken = randomBytes(32).toString('hex');
            const magicTokenHash = createHash('sha256').update(magicToken).digest('hex');
            const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    magicLinkToken: magicTokenHash,
                    magicLinkExpires: expires,
                }
            });

            // Send email
            await emailService.sendMagicLink(normalizedEmail, magicToken);

            await SecurityLogger.log({
                userId: user.id,
                eventType: SecurityEventType.MAGIC_LINK_REQUESTED,
                ip,
                userAgent,
                metadata: { method: 'MAGIC_LINK' }
            });

            return { success: true };
        } catch (error) {
            logger.error('[AUTH_MAGIC_LINK_REQUEST_ERROR]', { error });
            return { success: false, error: 'حدث خطأ أثناء إرسال الرابط' };
        }
    }

    /**
     * Verify Magic Link and log the user in.
     */
    static async verifyMagicLink(token: string, ip: string, userAgent: string, location?: string): Promise<AuthResult> {
        try {
            const tokenHash = createHash('sha256').update(token).digest('hex');

            const user = await prisma.user.findFirst({
                where: {
                    magicLinkToken: tokenHash,
                    magicLinkExpires: { gt: new Date() },
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    name: true,
                    role: true,
                    avatar: true,
                    emailVerified: true,
                }
            });

            if (!user) {
                return { success: false, error: 'الرابط غير صالح أو انتهت صلاحيته', statusCode: 401 };
            }

            // Create session
            const { session, accessToken, refreshToken } = await SessionService.createSession(
                user.id,
                user.role,
                ip,
                userAgent,
                true, // Default to persistent for magic links
                location
            );

            // Clear magic link token (one-time use)
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    magicLinkToken: null,
                    magicLinkExpires: null,
                    lastLogin: new Date(),
                }
            });

            await SecurityLogger.logLogin(user.id, ip, userAgent, session.id);

            return {
                success: true,
                user,
                accessToken,
                refreshToken,
                sessionId: session.id
            };
        } catch (error) {
            logger.error('[AUTH_MAGIC_LINK_VERIFY_ERROR]', { error });
            return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول', statusCode: 500 };
        }
    }
}

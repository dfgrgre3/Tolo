import prisma from '@/lib/db';
import { PasswordService } from './password-service';
import { SessionService } from './session-service';
import { SecurityLogger, SecurityEventType } from './security-logger';
import { TwoFactorService } from './two-factor-service';
import { logger } from '@/lib/logger';
import { RequestDeduplication } from '@/lib/request-dedup';
import { randomBytes, createHash } from 'crypto';
import { NotificationQueueService } from '@/services/notification-queue-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * AuthService - Central authentication business logic layer.
 * 
 * Architectural Decision:
 * This service encapsulates ALL authentication logic, separating it from
 * API route handlers (Controllers). This follows Clean Architecture principles:
 * 
 * Route Handler (Controller) â†’ AuthService (Use Case) â†’ Prisma (Repository)
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
  referredByCode?: string;
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
    phoneVerified: boolean | null;
    twoFactorEnabled?: boolean;
    status: string;
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
  static async login(input: LoginInput & {location?: string;}): Promise<AuthResult> {
    const { email, password, rememberMe = false, ip, userAgent, location: _location } = input;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Robust input validation
      if (!password || typeof password !== 'string') {
        return {
          success: false,
          error: 'Invalid email or password',
          statusCode: 400
        };
      }

      if (password.length > 256) {
        await SecurityLogger.logFailedLogin(ip, userAgent, 'PASSWORD_TOO_LONG');
        return {
          success: false,
          error: 'Invalid email or password',
          statusCode: 401
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
          phoneVerified: true,
          twoFactorEnabled: true,
          status: true
        }
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
          statusCode: 401
        };
      }

      // 2. Verify password (bcrypt constant-time comparison)
      const isValidPassword = await PasswordService.compare(password, user.passwordHash);

      if (!isValidPassword) {
        await SecurityLogger.logFailedLogin(ip, userAgent, 'INVALID_PASSWORD');
        return {
          success: false,
          error: 'Invalid email or password',
          statusCode: 401
        };
      }

      // 3. User status check (Security HARDENING)
      if (user.status !== 'ACTIVE') {
        const statusMessages: Record<string, string> = {
          'INACTIVE': 'هذا الحساب غير نشط حالياً. يرجى التواصل مع الدعم.',
          'SUSPENDED': 'تم تعليق هذا الحساب لمخالفة الشروط. يرجى التواصل مع الإدارة.',
          'DELETED': 'هذا الحساب محذوف. لا يمكنك تسجيل الدخول.'
        };

        await SecurityLogger.logFailedLogin(ip, userAgent, `ACCOUNT_${user.status}`);

        return {
          success: false,
          error: statusMessages[user.status] || 'لا يمكنك تسجيل الدخول بهذا الحساب حالياً.',
          statusCode: 403
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
            phoneVerified: user.phoneVerified,
            status: user.status,
            twoFactorEnabled: user.twoFactorEnabled
          }
        };
      }

      // 4. Check email verification (Bypassed in development mode)
      if (!user.emailVerified && process.env.NODE_ENV === 'production') {
        return {
          success: false,
          error: 'يرجى تفعيل بريدك الإلكتروني قبل تسجيل الدخول. تم إرسال رابط التفعيل عند التسجيل.',
          statusCode: 403
        };
      }

      // 5. Create session and generate tokens
      const { session, accessToken, refreshToken } = await SessionService.createSession(
        user.id,
        user.role,
        ip,
        userAgent,
        rememberMe,
        _location
      );

      // 5. Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
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
          phoneVerified: user.phoneVerified,
          status: user.status
        },
        accessToken,
        refreshToken,
        sessionId: session.id
      };
    } catch (error: any) {
      logger.error('[AUTH_LOGIN_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });

      return {
        success: false,
        error: process.env.NODE_ENV === 'production' ?
        'Internal server error' :
        `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
        statusCode: 500
      };
    }
  }

  /**
   * Verify 2FA token and complete login.
   */
  static async verify2FA(userId: string, token: string, ip: string, userAgent: string, rememberMe: boolean = false, _location?: string): Promise<AuthResult> {
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
          phoneVerified: true,
          twoFactorSecret: true,
          status: true
        }
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
        rememberMe,
        _location
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
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
          phoneVerified: user.phoneVerified,
          status: user.status
        },
        accessToken,
        refreshToken,
        sessionId: session.id
      };
    } catch (error: any) {
      logger.error('[AUTH_2FA_VERIFY_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });
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
  static async register(input: RegisterInput & {location?: string;}): Promise<AuthResult> {
    const {
      email, username, password, role = 'STUDENT', ip, userAgent, location: _location,
      country, dateOfBirth, gender, phone, alternativePhone,
      gradeLevel, educationType, section, interestedSubjects = [], studyGoal,
      subjectsTaught = [], classesTaught = [], experienceYears, referredByCode
    } = input;

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 0. Request Deduplication (Prevent rapid double-clicks/retries)
      const dedup = await RequestDeduplication.acquire(`register:${normalizedEmail}`);
      if (dedup.isDuplicate) {
        logger.warn(`[AUTH] Duplicate registration blocked for ${normalizedEmail}`);
        return {
          success: true, // Return success to the client
          statusCode: 200
        };
      }

      // 1. Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingUser) {
        // Return ambiguous response to prevent email enumeration
        return {
          success: true, // Intentionally true for security
          statusCode: 200
        };
      }

      // 2. Hash password with bcrypt (12 salt rounds)
      const passwordHash = await PasswordService.hash(password);

      // 3. Generate email verification token
      const verifyToken = randomBytes(32).toString('hex');
      const verifyTokenHash = createHash('sha256').update(verifyToken).digest('hex');
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Find referrer if code is provided
      let referrerId: string | undefined;
      if (referredByCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referredByCode.toUpperCase() },
          select: { id: true }
        });
        if (referrer) referrerId = referrer.id;
      }

      // Generate referral code for new user
      const newReferralCode = uuidv4().split('-')[0].toUpperCase();

      // 4. Create user
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          username: username || normalizedEmail.split('@')[0],
          passwordHash,
          emailVerificationToken: verifyTokenHash,
          emailVerificationExpires: verifyExpires,
          emailVerified: false,
          role: role && role !== 'STUDENT' ? role as any : undefined,
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
          experienceYears,
          referredById: referrerId,
          referralCode: newReferralCode
        }
      });

      // 5. Log registration event
      await SecurityLogger.log({
        userId: user.id,
        eventType: SecurityEventType.REGISTER,
        ip,
        userAgent
      });

      // 6. Enqueue verification email (Background Step for Scalability)
      // Use a deterministic jobId to prevent BullMQ-level duplication
      await NotificationQueueService.enqueue({
        userId: user.id,
        title: 'تفعيل حسابك في منصة تولو',
        message: `مرحباً ${username || normalizedEmail.split('@')[0]}! يرجى تفعيل حسابك لإكمال عملية التسجيل.`, // The worker will handle the template
        type: 'success',
        channels: ['email'],
        actionUrl: `/verify-email?token=${verifyToken}`,
        idempotencyKey: `register-verification:${user.id}` // Redundant check
      }, {
        jobId: `register-verification:${user.id}`
      });

      // Mark dedup as completed
      await RequestDeduplication.complete(`register:${normalizedEmail}`);

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
          phoneVerified: user.phoneVerified,
          status: user.status
        },
        statusCode: 201
      };
    } catch (error: any) {
      logger.error('[AUTH_REGISTER_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });

      // Release dedup on error so the user can try again if it truly failed
      const normalizedEmail = email.toLowerCase().trim();
      await RequestDeduplication.release(`register:${normalizedEmail}`);

      return {
        success: false,
        error: process.env.NODE_ENV === 'production' ?
        'Internal server error' :
        `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
        statusCode: 500
      };
    }
  }


  /**
   * Verify a user's email address using the verification token.
   */
  static async verifyEmail(token: string): Promise<{success: boolean;error?: string;}> {
    try {
      // Hash the provided token to compare with stored hash
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: tokenHash,
          emailVerificationExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return { success: false, error: 'Invalid or expired verification token' };
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      });

      // Log email verification
      await SecurityLogger.log({
        userId: user.id,
        eventType: SecurityEventType.EMAIL_VERIFIED,
        ip: 'SYSTEM', // Context missing here, but usually called from API
        userAgent: 'SYSTEM'
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
  static async forgotPassword(email: string, ip: string, userAgent: string): Promise<{success: boolean;}> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (!user) {
        // Ambiguous response for security (prevent enumeration)
        logger.warn('[FORGOT_PASSWORD] Email not found in database - no email sent', { email: normalizedEmail });
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
          resetTokenExpires: resetExpires
        }
      });

      await SecurityLogger.log({
        userId: user.id,
        eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
        ip,
        userAgent
      });

      // 4. Enqueue password reset email (Background Step)
      await NotificationQueueService.enqueue({
        userId: user.id,
        title: 'إعادة تعيين كلمة المرور - منصة تولو',
        message: 'لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.',
        type: 'warning',
        channels: ['email'],
        actionUrl: `/reset-password?token=${resetToken}`
      }, {
        jobId: `password-reset:${user.id}:${Math.floor(Date.now() / 300000)}` // Same reset link for 5 mins
      });
      logger.info('[PASSWORD_RESET_JOB_ENQUEUED]', { email: normalizedEmail });

      return { success: true };
    } catch (error) {
      logger.error('[AUTH_FORGOT_PASSWORD_ERROR]', { error });
      return { success: true }; // Still return success to prevent timing attacks/enumeration
    }
  }

  /**
   * Complete password reset flow.
   */
  static async resetPassword(token: string, newPassword: string, ip: string, userAgent: string): Promise<{success: boolean;error?: string;}> {
    try {
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          resetToken: tokenHash,
          resetTokenExpires: { gt: new Date() }
        }
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
          passwordChangedAt: new Date()
        }
      });

      // Invalidate all existing sessions for this user for security
      await SessionService.revokeAllSessions(user.id);

      await SecurityLogger.log({
        userId: user.id,
        eventType: SecurityEventType.PASSWORD_RESET_COMPLETE,
        ip,
        userAgent
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
  static async resendVerification(email: string, _ip: string, _userAgent: string): Promise<{success: boolean;error?: string;}> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Deduplication for resend (Prevent spamming the button)
      const dedup = await RequestDeduplication.acquire(`resend:${normalizedEmail}`);
      if (dedup.isDuplicate) return { success: true };

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, username: true, email: true, emailVerified: true }
      });

      if (!user || user.emailVerified) {
        await RequestDeduplication.complete(`resend:${normalizedEmail}`);
        return { success: true };
      }

      // Generate new token
      const verifyToken = randomBytes(32).toString('hex');
      const verifyTokenHash = createHash('sha256').update(verifyToken).digest('hex');
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verifyTokenHash,
          emailVerificationExpires: verifyExpires
        }
      });

      // 4. Enqueue verification email (Background)
      await NotificationQueueService.enqueue({
        userId: user.id,
        title: 'تفعيل حسابك في منصة تولو',
        message: `مرحباً ${user.username || normalizedEmail.split('@')[0]}! يرجى تفعيل حسابك لإكمال عملية التسجيل.`,
        type: 'success',
        channels: ['email'],
        actionUrl: `/verify-email?token=${verifyToken}`
      }, {
        jobId: `resend-verification:${user.id}:${Math.floor(Date.now() / 60000)}` // Limit to 1 per minute
      });

      await RequestDeduplication.complete(`resend:${normalizedEmail}`);
      return { success: true };
    } catch (error) {
      const normalizedEmail = email.toLowerCase().trim();
      await RequestDeduplication.release(`resend:${normalizedEmail}`);
      logger.error('[AUTH_RESEND_VERIFICATION_ERROR]', { error });
      return { success: true }; // Ambiguous for security
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
        phoneVerified: true,
        createdAt: true,
        lastLogin: true,
        xp: {
          select: {
            totalXP: true,
            level: true,
            studyXP: true,
            taskXP: true,
            examXP: true,
            challengeXP: true,
            questXP: true,
            seasonXP: true
          }
        },
        activity: {
          select: {
            currentStreak: true,
            longestStreak: true,
            totalStudyTime: true,
            tasksCompleted: true,
            examsPassed: true,
            pomodoroSessions: true,
            deepWorkSessions: true
          }
        },
        permissions: true,
        // Additional profile fields needed by settings page
        alternativePhone: true,
        dateOfBirth: true,
        gender: true,
        country: true,
        school: true,
        gradeLevel: true,
        educationType: true,
        section: true,
        studyGoal: true,
        bio: true,
        subjectsTaught: true,
        experienceYears: true,
        status: true
      }
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
        studyGoal: data.studyGoal
      };

      // Handle birthDate/dateOfBirth
      if (data.dateOfBirth) {
        updateData.dateOfBirth = data.dateOfBirth;
      } else if (data.birthDate) {
        updateData.dateOfBirth = new Date(data.birthDate);
      }

      return await prisma.user.update({
        where: { id: userId },
        data: updateData
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
      const isValid = (await PasswordService.compare(currentPassword, user.passwordHash)) as boolean;
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

      // Invalidate all existing sessions for this user for security
      // This ensures hijacked sessions are kicked out immediately
      await SessionService.revokeAllSessions(userId);

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
  static async requestMagicLink(email: string, ip: string, userAgent: string): Promise<{success: boolean;error?: string;}> {
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
          magicLinkExpires: expires
        }
      });

      // Send email (Background)
      await NotificationQueueService.enqueue({
        userId: user.id,
        title: 'رابط الدخول السريع - منصة تولو',
        message: 'استخدم الرابط التالي لتسجيل الدخول مباشرة إلى حسابك.',
        type: 'info',
        channels: ['email'],
        actionUrl: `/api/auth/magic-link/verify?token=${magicToken}`
      }, {
        jobId: `magic-link:${user.id}:${Math.floor(Date.now() / 60000)}`
      });

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
  static async verifyMagicLink(token: string, ip: string, userAgent: string, _location?: string): Promise<AuthResult> {
    try {
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          magicLinkToken: tokenHash,
          magicLinkExpires: { gt: new Date() }
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          avatar: true,
          emailVerified: true,
          phoneVerified: true,
          status: true
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
        _location
      );

      // Clear magic link token (one-time use)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          magicLinkToken: null,
          magicLinkExpires: null,
          lastLogin: new Date()
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
    } catch (error: any) {
      logger.error('[AUTH_MAGIC_LINK_VERIFY_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });
      return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول', statusCode: 500 };
    }
  }

  /**
   * Send a 6-digit verification code to the user's phone.
   */
  static async sendPhoneVerification(userId: string, phone: string, ip: string, userAgent: string): Promise<{success: boolean;error?: string;statusCode?: number;}> {
    try {
      // 1. Generate 6-digit numeric OTP using cryptographically secure random numbers
      const { randomInt } = await import('crypto');
      const otp = randomInt(100000, 999999).toString();
      const otpHash = createHash('sha256').update(otp).digest('hex');
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // 2. Update user with OTP info
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone,
          phoneVerificationOTP: otpHash,
          phoneVerificationExpires: expires,
          phoneVerificationAttempts: 0,
          phoneVerificationLastSent: new Date()
        }
      });

      // 3. Send SMS via SMSService
      const { smsService } = await import('@/services/sms-service');
      const result = await smsService.sendVerificationCode(phone, otp);

      if (!result.success) {
        return { success: false, error: result.error || 'فشل إرسال الرسالة النصية', statusCode: 424 };
      }

      await SecurityLogger.log({
        userId,
        eventType: SecurityEventType.PHONE_VERIFICATION_REQUESTED,
        ip,
        userAgent,
        metadata: { phone: phone.substring(0, 6) + '***' }
      });

      return { success: true };
    } catch (error: any) {
      logger.error('[AUTH_SEND_PHONE_VERIFY_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Verify the 6-digit phone verification code.
   */
  static async verifyPhone(userId: string, code: string, ip: string, userAgent: string): Promise<{success: boolean;error?: string;statusCode?: number;}> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          phoneVerificationOTP: true,
          phoneVerificationExpires: true,
          phoneVerificationAttempts: true
        }
      });

      if (!user || !user.phoneVerificationOTP) {
        return { success: false, error: 'لم يتم طلب رمز تحقق لهذا الرقم', statusCode: 400 };
      }

      // 1. Check attempts for brute force protection
      if (user.phoneVerificationAttempts >= 5) {
        return { success: false, error: 'تجاوزت الحد الأقصى للمحاولات. يرجى طلب رمز جديد.', statusCode: 429 };
      }

      // 2. Hash and compare
      const codeHash = createHash('sha256').update(code).digest('hex');
      const isValid = codeHash === user.phoneVerificationOTP;
      const isExpired = user.phoneVerificationExpires ? user.phoneVerificationExpires < new Date() : true;

      if (!isValid || isExpired) {
        // Increment attempts
        await prisma.user.update({
          where: { id: userId },
          data: { phoneVerificationAttempts: { increment: 1 } }
        });

        return {
          success: false,
          error: isExpired ? 'انتهت صلاحية الرمز' : 'كود التحقق غير صحيح',
          statusCode: 400
        };
      }

      // 3. Success - Update phoneVerified
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified: true,
          phoneVerificationOTP: null,
          phoneVerificationExpires: null
        }
      });

      await SecurityLogger.log({
        userId,
        eventType: SecurityEventType.PHONE_VERIFIED,
        ip,
        userAgent
      });

      return { success: true };
    } catch (error: any) {
      logger.error('[AUTH_VERIFY_PHONE_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }
}
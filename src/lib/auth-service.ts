import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
// @ts-ignore - jsonwebtoken type declarations issue
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { rateLimitingService } from './rate-limiting-service';
import { getJWTSecret } from './env-validation';
import { logger } from './logger';
// ⚠️ CRITICAL: Do NOT import PrismaClient directly from '@prisma/client'
// ⚠️ CRITICAL: لا تستورد PrismaClient مباشرة من '@prisma/client'
// ✅ Use the singleton instance from prisma.ts to avoid "Too many connections" errors
// ✅ استخدم النسخة الوحيدة من prisma.ts لتجنب خطأ "Too many connections"
import { prisma } from './prisma';
import {
  validateEmail,
  validatePassword,
} from './auth/validation';

// Get validated JWT_SECRET (throws error in production if invalid)
let JWT_SECRET: Uint8Array;
let JWT_SECRET_STRING: string;

// Lazy initialization to avoid throwing errors during module load
// Security: JWT_SECRET is required in all environments (no fallback)
function getJWTSecretSafe(): { secret: Uint8Array; secretString: string } {
  if (!JWT_SECRET || !JWT_SECRET_STRING) {
    try {
      JWT_SECRET_STRING = getJWTSecret();
      JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
    } catch (error) {
      // JWT_SECRET is required in all environments - no fallback for security
      logger.error('JWT_SECRET is not properly configured. This is required in all environments.', error instanceof Error ? error : new Error(String(error)));
      throw new Error('JWT_SECRET environment variable is required but not set. Please set it in your .env file.');
    }
  }
  return { secret: JWT_SECRET, secretString: JWT_SECRET_STRING };
}

const SESSION_DURATION = parseInt(process.env.SESSION_DURATION || '2592000', 10); // 30 days in seconds

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface TokenVerificationResult {
  isValid: boolean;
  user?: AuthUser;
  sessionId?: string;
  error?: string;
}

/**
 * ============================================
 * ⭐ الخدمة الأساسية للمصادقة (Server-Side)
 * ============================================
 * 
 * هذا هو المصدر الأساسي الوحيد الموثوق (Single Source of Truth) لجميع عمليات المصادقة على الخادم
 * 
 * ⚠️ IMPORTANT - البنية الموحدة بدون تضارب:
 * 
 * 📁 SERVER-SIDE (الخادم):
 *   ✅ src/lib/auth-service.ts → هذا الملف (الخدمة الأساسية) ⭐
 *      └─> يُستخدم من: src/auth.ts (نقطة التصدير الموحدة)
 * 
 * 📁 CLIENT-SIDE (العميل):
 *   ✅ src/contexts/auth-context.tsx → نقطة التصدير الموحدة ⭐
 *      └─> src/components/auth/UnifiedAuthProvider.tsx
 *          └─> src/lib/auth/unified-auth-manager.ts
 * 
 * 📖 للاستخدام:
 *   ✅ في API Routes: 
 *      import { authService } from '@/lib/auth-service'
 *   
 *   ✅ في Server Components: 
 *      import { auth } from '@/auth' (يستخدم authService داخلياً)
 *   
 *   ✅ في Client Components: 
 *      import { useUnifiedAuth } from '@/contexts/auth-context'
 * 
 * 📚 راجع AUTH_STRUCTURE_UNIFIED.md للتفاصيل الكاملة
 */
export class AuthService {
  private static instance: AuthService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ==================== PASSWORD OPERATIONS ====================

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare a password with its hash
   */
  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ==================== TOKEN OPERATIONS ====================

  /**
   * Create access and refresh tokens for a user
   * Improved with better validation, error handling, and security
   * Enhanced with additional security checks and performance optimizations
   */
  async createTokens(user: AuthUser, sessionId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Get validated JWT_SECRET
    const { secret: jwtSecret } = getJWTSecretSafe();

    // Validate user data with comprehensive checks
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new Error('User data is required and must be an object');
    }

    if (!user.id || typeof user.id !== 'string' || user.id.trim().length === 0) {
      throw new Error('Valid user ID is required for token creation');
    }

    if (!user.email || typeof user.email !== 'string' || user.email.trim().length === 0) {
      throw new Error('Valid user email is required for token creation');
    }

    // Validate email format using centralized validation
    const emailValidation = validateEmail(user.email);
    if (!emailValidation.isValid) {
      throw new Error('Invalid email format for token creation');
    }
    const normalizedEmail = emailValidation.normalized!;

    // Validate session ID format if provided
    if (sessionId !== undefined) {
      if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        throw new Error('Invalid session ID format');
      }
      // Validate UUID format if sessionId looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (sessionId.length === 36 && !uuidRegex.test(sessionId)) {
        logger.warn('Session ID format may be invalid:', sessionId.substring(0, 8) + '...');
      }
    }

    try {
      // Prepare token payload with sanitized data
      const tokenPayload = {
        userId: user.id.trim(),
        email: normalizedEmail,
        name: user.name ? String(user.name).trim().substring(0, 100) : undefined, // Limit name length
        role: (user.role && typeof user.role === 'string') ? user.role.trim() : 'user',
        sessionId: sessionId ? sessionId.trim() : undefined,
        iat: Math.floor(Date.now() / 1000), // Issued at timestamp
      };

      // Create access token with 1 hour expiration
      // Using shorter expiration for better security
      const accessToken = await new SignJWT(tokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .setIssuer('thanawy-auth') // Add issuer for better security
        .sign(jwtSecret);

      // Validate access token was created and has correct format
      if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
        throw new Error('Failed to create access token: empty or invalid');
      }
      
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3 || tokenParts.some(part => part.length === 0)) {
        throw new Error('Failed to create valid access token: invalid format');
      }

      // Create refresh token with 30 days expiration
      // Refresh token contains minimal data for security
      const refreshTokenPayload = {
        userId: user.id.trim(),
        sessionId: sessionId ? sessionId.trim() : undefined,
        type: 'refresh', // Token type identifier
        iat: Math.floor(Date.now() / 1000),
      };

      const refreshToken = await new SignJWT(refreshTokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .setIssuer('thanawy-auth')
        .sign(jwtSecret);

      // Validate refresh token was created and has correct format
      if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
        throw new Error('Failed to create refresh token: empty or invalid');
      }
      
      const refreshTokenParts = refreshToken.split('.');
      if (refreshTokenParts.length !== 3 || refreshTokenParts.some(part => part.length === 0)) {
        throw new Error('Failed to create valid refresh token: invalid format');
      }

      return { accessToken, refreshToken };
    } catch (error: unknown) {
      logger.error('Error creating tokens', error instanceof Error ? error : new Error(String(error)), {
        errorType: typeof error,
        hasUser: !!user,
        userId: user?.id,
      });
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('JWT') || error.message.includes('secret')) {
          throw new Error('JWT configuration error: Please check JWT_SECRET environment variable.');
        }
        throw new Error(`Failed to create authentication tokens: ${error.message}`);
      }
      
      throw new Error('Failed to create authentication tokens: Unknown error');
    }
  }

  /**
   * Verify and decode a JWT token
   * Improved with better validation and error handling
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    // Validate token format before attempting verification
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        isValid: false,
        error: 'Token is required',
      };
    }

    // Basic JWT format validation (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return {
        isValid: false,
        error: 'Invalid token format',
      };
    }

    try {
      const { secret } = getJWTSecretSafe();
      const { payload } = await jwtVerify(token, secret);

      // Validate payload structure
      if (!payload || !payload.userId || !payload.email) {
        return {
          isValid: false,
          error: 'Invalid token payload',
        };
      }

      // Validate user ID and email format
      if (typeof payload.userId !== 'string' || payload.userId.trim().length === 0) {
        return {
          isValid: false,
          error: 'Invalid user ID in token',
        };
      }

      // Validate email format using centralized validation
      const emailValidation = validateEmail(payload.email);
      if (!emailValidation.isValid) {
        return {
          isValid: false,
          error: 'Invalid email in token',
        };
      }

      const user: AuthUser = {
        id: payload.userId as string,
        email: payload.email as string,
        name: (payload.name as string) || undefined,
        role: (payload.role as string) || 'user',
      };

      return {
        isValid: true,
        user,
        sessionId: payload.sessionId ? (payload.sessionId as string) : undefined,
      };
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = 'Token verification failed';
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorMessage = 'Token has expired';
        } else if (error.message.includes('invalid') || error.message.includes('malformed')) {
          errorMessage = 'Invalid token format';
        } else if (error.message.includes('signature')) {
          errorMessage = 'Invalid token signature';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        isValid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, userAgent: string, ip: string): Promise<TokenVerificationResult & { accessToken?: string; refreshToken?: string }> {
    try {
      const { secret } = getJWTSecretSafe();
      const { payload } = await jwtVerify(refreshToken, secret);
      const userId = payload.userId as string;
      const sessionId = payload.sessionId as string;

      // Validate session exists and is not expired
      const dbClient = prisma;
      if (!dbClient) throw new Error('Database client not available');
      const session = await dbClient.session.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId || session.expiresAt < new Date()) {
        return {
          isValid: false,
          error: 'Invalid or expired session',
        };
      }

      const user = await dbClient!.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!user) {
        return {
          isValid: false,
          error: 'User not found',
        };
      }

      // Update session with new expiration
      await dbClient!.session.update({
        where: { id: sessionId },
        data: {
          expiresAt: new Date(Date.now() + SESSION_DURATION * 1000),
          userAgent,
          ip
        }
      });

      const { accessToken, refreshToken: newRefreshToken } = await this.createTokens(user as AuthUser, sessionId);

      return {
        isValid: true,
        user: user as AuthUser,
        sessionId,
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  // ==================== USER OPERATIONS ====================

  /**
   * Find user by email with caching
   * Improved with timeout protection, better error handling, and security
   * Enhanced with input validation and sanitization
   */
  async findUserByEmail(email: string) {
    // Comprehensive input validation using centralized validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Invalid email in findUserByEmail:', emailValidation.error);
      }
      return null;
    }
    const normalizedEmail = emailValidation.normalized!;

    // Fetch from database (with timeout)
    try {
      const dbClient = prisma;
      if (!dbClient) throw new Error('Database client not available');
      const dbPromise = dbClient.user.findUnique({
        where: { email: normalizedEmail },
      });

      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000); // 3 second timeout
      });

      const user = await Promise.race([dbPromise, timeoutPromise]);


      return user;
    } catch (error) {
      logger.error('Error finding user by email:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Find user by ID with full profile
   */
  async findUserById(id: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');
    return dbClient.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLogin: true,
        biometricEnabled: true,
        twoFactorEnabled: true,
      }
    });
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');
    return dbClient.user.update({
      where: { id },
      data: { lastLogin: new Date() }
    });
  }

  // ==================== SESSION OPERATIONS ====================

  /**
   * Create a new session for a user
   */
  async createSession(userId: string, userAgent: string, ip: string): Promise<SessionData> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');
    const session = await dbClient.session.create({
      data: {
        id: sessionId,
        userId,
        userAgent,
        ip,
        expiresAt: expiresAt
      } as any
    });

    return session;
  }

  /**
   * Delete a session and invalidate cache
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const dbClient = prisma;
      if (!dbClient) throw new Error('Database client not available');
      await dbClient.session.delete({
        where: { id: sessionId }
      });
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get session by ID with caching
   * Improved with timeout protection and better error handling
   */
  async getSession(sessionId: string) {
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return null;
    }

    // Fetch from database (with timeout)
    try {
      const dbClient = prisma;
      if (!dbClient) throw new Error('Database client not available');
      const dbPromise = dbClient.session.findUnique({
        where: { id: sessionId }
      });

      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 2000); // 2 second timeout
      });

      const session = await Promise.race([dbPromise, timeoutPromise]);


      return session;
    } catch (error) {
      logger.error('Error getting session:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');
    await dbClient.session.deleteMany({
      where: { userId }
    });
  }

  // ==================== AUTHENTICATION OPERATIONS ====================

  /**
   * Authenticate user login
   * Improved with better validation, error handling, and performance optimizations
   * Enhanced with additional security checks and input sanitization
   * 
   * Security improvements:
   * - Comprehensive input validation and sanitization
   * - Rate limiting protection
   * - Timeout protection for all async operations
   * - Constant-time password comparison
   * - Secure session management
   */
  async login(email: string, password: string, userAgent: string, ip: string): Promise<TokenVerificationResult & { accessToken?: string; refreshToken?: string }> {
    const startTime = Date.now();
    
    // Validate inputs early using centralized validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return {
        isValid: false,
        error: emailValidation.error || 'البريد الإلكتروني غير صحيح',
      };
    }
    const normalizedEmail = emailValidation.normalized!;

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return {
        isValid: false,
        error: passwordValidation.error || 'كلمة المرور غير صحيحة',
      };
    }

    // Sanitize user agent and IP (limit length to prevent DoS)
    const safeUserAgent = (userAgent || 'unknown').substring(0, 500);
    const safeIp = (ip || 'unknown').substring(0, 45); // IPv6 max length
    const clientId = `${safeIp}-${safeUserAgent}`;

    // Check rate limiting with timeout protection
    try {
      const rateLimitCheck = this.isRateLimited(clientId);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 2000); // 2 second timeout
      });

      const isRateLimited = await Promise.race([rateLimitCheck, timeoutPromise]);
      if (isRateLimited) {
        // Log rate limit event (non-blocking)
        this.recordFailedAttempt(clientId).catch(() => {
          // Silent fail
        });
        return {
          isValid: false,
          error: 'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة.',
        };
      }
    } catch (rateLimitError) {
      // Log but continue - don't block login if rate limit check fails
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Rate limit check failed, continuing:', rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError));
      }
    }

    // Find user with timeout protection
    let user;
    try {
      const findUserPromise = this.findUserByEmail(normalizedEmail);
      const timeoutPromise = new Promise<any>((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5 second timeout
      });

      user = await Promise.race([findUserPromise, timeoutPromise]);
    } catch (findUserError) {
      logger.error('Error finding user:', findUserError);
      return {
        isValid: false,
        error: 'حدث خطأ أثناء التحقق من الحساب. يرجى المحاولة مرة أخرى.',
      };
    }

    if (!user) {
      // Record failed attempt (non-blocking)
      // Use setTimeout to ensure logging doesn't affect timing
      setTimeout(() => {
        this.recordFailedAttempt(clientId).catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Failed to record failed attempt:', err instanceof Error ? err.message : String(err));
          }
        });
      }, 0);
      return {
        isValid: false,
        error: 'بيانات تسجيل الدخول غير صحيحة',
      };
    }

    // Validate password hash exists
    if (!user.passwordHash || user.passwordHash === 'oauth_user' || user.passwordHash.trim().length === 0) {
      this.recordFailedAttempt(clientId).catch(() => {
        // Silent fail
      });
      return {
        isValid: false,
        error: 'بيانات تسجيل الدخول غير صحيحة',
      };
    }

    // Verify password with timeout protection and constant-time comparison
    // Using constant-time comparison to prevent timing attacks
    let isValid = false;
    try {
      const passwordCheckPromise = AuthService.comparePasswords(password, user.passwordHash);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000); // 5 second timeout
      });

      isValid = await Promise.race([passwordCheckPromise, timeoutPromise]);
      
      // Log failed attempts for security monitoring (non-blocking)
      // Use setTimeout to ensure logging doesn't affect timing
      if (!isValid) {
        setTimeout(() => {
          logger.debug('Password mismatch for user', { 
            userId: user.id, 
            email: normalizedEmail.substring(0, 50), // Limit email length in logs
            timestamp: new Date().toISOString(),
          });
        }, 0);
      }
    } catch (passwordError) {
      logger.error('Password comparison error:', passwordError instanceof Error ? passwordError.message : String(passwordError));
      // Record failed attempt (non-blocking)
      setTimeout(() => {
        this.recordFailedAttempt(clientId).catch(() => {
          // Silent fail
        });
      }, 0);
      return {
        isValid: false,
        error: 'حدث خطأ أثناء التحقق من كلمة المرور. يرجى المحاولة مرة أخرى.',
      };
    }

    if (!isValid) {
      // Record failed attempt (non-blocking)
      // Use setTimeout to ensure logging doesn't affect timing
      setTimeout(() => {
        this.recordFailedAttempt(clientId).catch(() => {
          // Silent fail
        });
      }, 0);
      return {
        isValid: false,
        error: 'بيانات تسجيل الدخول غير صحيحة',
      };
    }

    // Update last login and reset rate limit in parallel (non-blocking)
    Promise.allSettled([
      this.updateLastLogin(user.id),
      this.resetRateLimit(clientId),
    ]).catch(() => {
      // Silent fail - login can proceed
    });

    // Create session with timeout protection
    let session;
    try {
      const sessionPromise = this.createSession(user.id, safeUserAgent, safeIp);
      const timeoutPromise = new Promise<any>((resolve, reject) => {
        setTimeout(() => reject(new Error('Session creation timeout')), 5000);
      });

      session = await Promise.race([sessionPromise, timeoutPromise]);
    } catch (sessionError) {
      logger.error('Failed to create session:', sessionError);
      return {
        isValid: false,
        error: 'فشل في إنشاء الجلسة. يرجى المحاولة مرة أخرى.',
      };
    }

    if (!session || !session.id) {
      logger.error('Invalid session created');
      return {
        isValid: false,
        error: 'فشل في إنشاء الجلسة. يرجى المحاولة مرة أخرى.',
      };
    }

    // Generate tokens with timeout protection
    let accessToken: string;
    let refreshToken: string;
    try {
      const tokensPromise = this.createTokens({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      }, session.id);

      const timeoutPromise = new Promise<{ accessToken: string; refreshToken: string }>((resolve, reject) => {
        setTimeout(() => reject(new Error('Token generation timeout')), 5000);
      });

      const tokens = await Promise.race([tokensPromise, timeoutPromise]);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    } catch (tokenError) {
      logger.error('Failed to generate tokens:', tokenError);
      return {
        isValid: false,
        error: 'فشل في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.',
      };
    }

    if (!accessToken || !refreshToken || accessToken.trim().length === 0 || refreshToken.trim().length === 0) {
      logger.error('Invalid tokens generated');
      return {
        isValid: false,
        error: 'فشل في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.',
      };
    }

    // Log successful login duration for monitoring
    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`AuthService.login completed successfully in ${duration}ms`);
    }

    return {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      },
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, name?: string): Promise<TokenVerificationResult & { user?: AuthUser }> {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      return {
        isValid: false,
        error: 'Email already registered',
      };
    }

    const hashedPassword = await AuthService.hashPassword(password);

    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');
    const user = await dbClient.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
      },
    });

    return {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      },
    };
  }

  /**
   * Logout user (delete session)
   */
  async logout(sessionId: string): Promise<boolean> {
    return this.deleteSession(sessionId);
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.deleteAllUserSessions(userId);
  }

  // ==================== RATE LIMITING OPERATIONS ====================

  /**
   * Check if client is rate limited
   */
  async isRateLimited(clientId: string): Promise<boolean> {
    const rateLimitResult = await rateLimitingService.checkRateLimit(clientId, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutMs: ACCOUNT_LOCKOUT_MS
    });

    return !rateLimitResult.allowed;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(clientId: string): Promise<void> {
    await rateLimitingService.recordFailedAttempt(clientId, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutMs: ACCOUNT_LOCKOUT_MS
    });
  }

  /**
   * Reset rate limit for client
   */
  async resetRateLimit(clientId: string): Promise<void> {
    await rateLimitingService.resetRateLimit(clientId);
  }

  // ==================== REQUEST UTILITIES ====================

  /**
   * Extract client IP from request
   */
  getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }

  /**
   * Extract user agent from request
   */
  getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  /**
   * Extract token from various sources
   * Priority: 1. Cookies (httpOnly cookies are more secure), 2. Authorization header
   * This ensures cookies are checked first for better security and consistency
   */
  extractToken(input: NextRequest | string | null | undefined): string | null {
    if (!input) {
      return null;
    }

    if (typeof input === 'string') {
      return input;
    }

    // Priority 1: Check cookies first (httpOnly cookies are more secure)
    // Check access_token first (standard cookie name used by login and OAuth routes)
    // Then check authToken for backward compatibility
    const tokenCookie = input.cookies.get('access_token')?.value || input.cookies.get('authToken')?.value;
    if (tokenCookie) {
      return tokenCookie;
    }

    // Priority 2: Check Authorization header (fallback for API clients)
    const authHeader = input.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  // ==================== SECURITY OPERATIONS ====================

  /**
   * Log security event
   * Improved with timeout protection and better error handling
   */
  async logSecurityEvent(userId: string | null, event: string, ip: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!event || typeof event !== 'string') {
      return;
    }

    try {
      const dbClient = prisma;
      if (!dbClient) return;
      
      // Add timeout to prevent hanging
      const logData: any = {
        eventType: event,
        ip: ip || 'unknown',
        userAgent: (metadata?.userAgent as string) || '',
        deviceInfo: metadata?.deviceInfo ? JSON.stringify(metadata.deviceInfo) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      };
      if (userId) {
        logData.userId = userId;
      }
      const logPromise = dbClient.securityLog.create({
        data: logData,
      });

      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 2000); // 2 second timeout
      });

      await Promise.race([logPromise, timeoutPromise]);
    } catch (error) {
      // Only log errors in development to avoid noise in production
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Failed to log security event', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Verify a JWT token and optionally check session validity
   * @param request NextRequest object
   * @param options Verification options
   * @returns TokenVerificationResult with user data or error
   * Priority: 1. Cookies (httpOnly cookies are more secure), 2. Authorization header
   */
  async verifyTokenFromRequest(
    request: NextRequest,
    options: {
      checkSession?: boolean; // Whether to check session validity in DB
    } = {}
  ): Promise<TokenVerificationResult> {
    try {
      // Priority 1: Get token from cookies first (httpOnly cookies are more secure)
      let token = request.cookies.get('access_token')?.value || request.cookies.get('authToken')?.value;
      
      // Priority 2: Fallback to Authorization header (for API clients)
      if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7); // Remove "Bearer " prefix
        }
      }

      if (!token) {
        return {
          isValid: false,
          error: 'No token provided in cookies or authorization header'
        };
      }

      // Verify token signature using jose
      const { secret } = getJWTSecretSafe();
      const { payload } = await jwtVerify(token, secret);
      
      const user: AuthUser = {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      };

      let sessionId: string | undefined;

      // Extract sessionId if present
      if (payload.sessionId) {
        sessionId = payload.sessionId as string;
        
        // Optionally check session validity
        if (options.checkSession && sessionId) {
          const dbClient = prisma;
          if (!dbClient) {
            return {
              isValid: false,
              error: 'Database client not available'
            };
          }
          const session = await dbClient.session.findUnique({
            where: {
              id: sessionId,
              userId: user.id,
              expiresAt: {
                gt: new Date()
              }
            }
          });

          if (!session) {
            return {
              isValid: false,
              error: 'Session not found or expired'
            };
          }
        }
      }

      return {
        isValid: true,
        user,
        sessionId
      };
    } catch (error) {
      logger.error('Token verification error', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        error: 'Invalid or expired token'
      };
    }
  }

  /**
   * Verify token from various sources (string, request, etc.)
   */
  async verifyTokenFromInput(input: NextRequest | string | null | undefined, checkSession = false): Promise<TokenVerificationResult> {
    // Handle Request object
    if (input instanceof NextRequest) {
      return this.verifyTokenFromRequest(input, { checkSession });
    }

    // Handle string token
    if (typeof input === 'string') {
      try {
        const { secret } = getJWTSecretSafe();
        const { payload } = await jwtVerify(input, secret);
        
        const user: AuthUser = {
          id: payload.userId as string,
          email: payload.email as string,
          name: payload.name as string,
          role: payload.role as string,
        };

        const sessionId: string | undefined = payload.sessionId as string;

        // Check session validity if requested
        if (checkSession && sessionId) {
          const dbClient = prisma;
          if (!dbClient) {
            return {
              isValid: false,
              error: 'Database client not available'
            };
          }
          const session = await dbClient.session.findUnique({
            where: {
              id: sessionId,
              userId: user.id,
              expiresAt: {
                gt: new Date()
              }
            }
          });

          if (!session) {
            return {
              isValid: false,
              error: 'Session not found or expired'
            };
          }
        }

        return {
          isValid: true,
          user,
          sessionId
        };
      } catch (error) {
        logger.error('Token verification error', error instanceof Error ? error : new Error(String(error)));
        return {
          isValid: false,
          error: 'Invalid or expired token'
        };
      }
    }

    // Handle no input
    if (!input) {
      return {
        isValid: false,
        error: 'No token provided',
      };
    }

    // Try to extract token from other sources
    const token = this.extractToken(input);
    if (!token) {
      return {
        isValid: false,
        error: 'No token provided',
      };
    }

    return this.verifyTokenFromInput(token, checkSession);
  }

  /**
   * Get current user from server-side context
   * Note: This function can only be used in Server Components or API Routes
   * Checks cookies first (httpOnly cookies are more secure), then falls back to other sources
   */
  async getCurrentUser(): Promise<TokenVerificationResult> {
    try {
      // Dynamically import cookies to avoid Client Component issues
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      
      // Priority 1: Check cookies first (httpOnly cookies are more secure)
      // Check access_token first (standard cookie name used by login and OAuth routes)
      // Then check authToken for backward compatibility
      const token =
        cookieStore.get('access_token')?.value ||
        cookieStore.get('authToken')?.value ||
        null;

      if (!token) {
        return {
          isValid: false,
          error: 'No token provided in cookies',
        };
      }

      // Verify token and check session validity
      return this.verifyTokenFromInput(token, true);
    } catch {
      return {
        isValid: false,
        error: 'getCurrentUser can only be used in Server Components or API Routes',
      };
    }
  }

  /**
   * Validate if user has required role
   */
  async validateUserRole(userId: string, requiredRoles: string[]): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user || !user.role) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }

  /**
   * Check if user is authenticated and session is valid
   */
  async isAuthenticated(input: NextRequest | string | null | undefined): Promise<boolean> {
    const verification = await this.verifyTokenFromInput(input);
    return verification.isValid;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// ==================== BACKWARD COMPATIBILITY EXPORTS ====================

/**
 * Legacy function exports for backward compatibility
 * These will be deprecated in favor of the AuthService class
 */

// Password operations
export const hashPassword = AuthService.hashPassword;
export const comparePasswords = AuthService.comparePasswords;

// Token operations
export function verifyToken(input: NextRequest | string | null | undefined): DecodedToken | null {
  const token = authService.extractToken(input);
  if (!token) {
    return null;
  }

  try {
    const { secretString } = getJWTSecretSafe();
    const decoded = jwt.verify(token, secretString) as JwtPayload & DecodedToken;

    if (!decoded || !decoded.userId) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      sessionId: decoded.sessionId,
      exp: decoded.exp,
      iat: decoded.iat
    };
  } catch (error) {
    logger.error('JWT verification failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Server-side auth utility
export async function auth(): Promise<{ user: DecodedToken } | null> {
  const result = await authService.getCurrentUser();
  if (result.isValid && result.user) {
    return {
      user: {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        sessionId: result.sessionId,
      }
    };
  }
  return null;
}

export interface DecodedToken {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  sessionId?: string;
  exp?: number;
  iat?: number;
}
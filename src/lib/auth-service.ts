import { SignJWT, jwtVerify } from 'jose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { rateLimitingService } from '@/lib/rate-limiting-service';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import { getJWTSecret } from '@/lib/env-validation';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Helper for safe secret retrieval
function getJWTSecretSafe() {
  const secretString = getJWTSecret();
  return {
    secret: new TextEncoder().encode(secretString),
    secretString
  };
}

// Constants
const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  passwordHash?: string;
}

export interface TokenVerificationResult {
  isValid: boolean;
  user?: AuthUser;
  sessionId?: string;
  error?: string;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  deviceInfo?: string;
  expiresAt: Date;
}

export interface DecodedToken {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  sessionId?: string;
  exp?: number;
  iat?: number;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() { }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create access and refresh tokens
   */
  async createTokens(user: AuthUser, sessionId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const { secret: jwtSecret } = getJWTSecretSafe();

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionId,
        type: 'access',
      };

      // Create access token with 1 hour expiration
      // Using shorter expiration for better security
      const accessToken = await new SignJWT(tokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .setIssuer('thanawy-auth') // Add issuer for better security
        .sign(jwtSecret);

      // Create refresh token with 30 days expiration
      const refreshToken = await new SignJWT({
        userId: user.id,
        sessionId,
        type: 'refresh'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .setIssuer('thanawy-auth')
        .sign(jwtSecret);

      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Token creation failed', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to create authentication tokens');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string, userAgent: string, ip: string): Promise<TokenVerificationResult & { accessToken?: string; refreshToken?: string }> {
    try {
      const { secret: jwtSecret } = getJWTSecretSafe();

      let payload;
      try {
        const result = await jwtVerify(refreshToken, jwtSecret);
        payload = result.payload;
      } catch (verifyError) {
        return { isValid: false, error: 'Invalid or expired refresh token' };
      }

      if (payload.type !== 'refresh') {
        return { isValid: false, error: 'Invalid token type' };
      }

      const userId = payload.userId as string;
      const sessionId = payload.sessionId as string;

      const dbClient = prisma;
      if (!dbClient) throw new Error('Database client not available');

      // Check if session exists and is valid
      if (!sessionId) {
        return { isValid: false, error: 'Session ID not found in token' };
      }
      
      const session = await dbClient.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
      });

      if (!session) {
        return { isValid: false, error: 'Session not found' };
      }
      
      if(session.refreshToken !== refreshToken){
          return { isValid: false, error: 'Invalid refresh token' };
      }

      if (session.expiresAt < new Date()) {
        // Clean up expired session
        await this.deleteSession(sessionId);
        return { isValid: false, error: 'Session expired' };
      }
      
      const user = session.user;

      if (!user) {
        return { isValid: false, error: 'User not found' };
      }

      // Generate new tokens
      const tokens = await this.createTokens({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      }, sessionId);

      // Update refresh token in DB
      if (sessionId) {
        await dbClient.session.update({
          where: { id: sessionId },
          data: { refreshToken: tokens.refreshToken }
        });
      }

      // Update last login time
      await this.updateLastLogin(user.id);

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role || undefined,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId,
      };

    } catch (error) {
      logger.error('Refresh token error:', error instanceof Error ? error : new Error(String(error)));
      return { isValid: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Create a new session
   */
  async createSession(userId: string, userAgent: string, ip: string, refreshToken: string, deviceInfo?: string): Promise<SessionData> {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

    try {
      const session = await dbClient.session.create({
        data: {
          id: uuidv4(),
          userId,
          expiresAt,
          userAgent: userAgent || 'unknown',
          ip: ip || 'unknown',
          deviceInfo,
          refreshToken,
        },
      });

      return {
        id: session.id,
        userId: session.userId,
        userAgent: session.userAgent || 'unknown',
        ip: session.ip || 'unknown',
        deviceInfo: session.deviceInfo || undefined,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      logger.error('Session creation failed', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to create session');
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const dbClient = prisma;
      if (!dbClient) return;

      await dbClient.user.update({
        where: { id: userId },
        data: { lastLogin: new Date() },
      });
    } catch (error) {
      // Non-critical error, just log it
      logger.warn('Failed to update last login', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Reset rate limit for a client
   */
  async resetRateLimit(clientId: string): Promise<void> {
    await rateLimitingService.resetRateLimit(clientId);
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');
    return dbClient.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create a new user
   */
  async createUser(data: { email: string; name?: string; passwordHash?: string; emailVerified?: boolean; }): Promise<AuthUser> {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    const user = await dbClient.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        emailVerified: data.emailVerified,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || undefined,
    };
  }

  /**
   * Find a user by email, or create them if they don't exist.
   * Useful for OAuth flows.
   */
  async findOrCreateUser(data: { email: string; name?: string; emailVerified?: boolean; }): Promise<{ user: AuthUser; isNewUser: boolean; }> {
    const existingUser = await this.findUserByEmail(data.email);

    if (existingUser) {
      return { user: existingUser, isNewUser: false };
    }

    const newUser = await this.createUser({
      ...data,
      passwordHash: 'oauth_user', // Indicate that this user uses OAuth
    });

    return { user: newUser, isNewUser: true };
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
   * Get session by ID
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

  async generateTwoFactorSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'Thanawy App', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Save secret to DB but don't enable 2FA yet
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    await dbClient.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false
      }
    });

    return {
      secret,
      qrCodeUrl
    };
  }

  /**
   * Generate temporary token for 2FA verification
   */
  async generate2FATempToken(user: { id: string; email: string; name?: string; role?: string }): Promise<string> {
    const { secret: jwtSecret } = getJWTSecretSafe();

    return new SignJWT({
      userId: user.id,
      email: user.email,
      type: '2fa_pending'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .setIssuer('thanawy-auth')
      .sign(jwtSecret);
  }

  /**
   * Verify and enable 2FA
   */
  async enableTwoFactor(userId: string, token: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    const user = await dbClient.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true }
    });

    if (!user || !user.twoFactorSecret) {
      return { success: false, error: '2FA setup not initiated' };
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Hash recovery codes
    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map(code => bcrypt.hash(code, 10))
    );

    await dbClient.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        recoveryCodes: JSON.stringify(hashedRecoveryCodes)
      }
    });

    return { success: true, recoveryCodes };
  }

  /**
   * Verify 2FA token for login
   */
  async verify2FALogin(tempToken: string, code: string, userAgent: string, ip: string): Promise<TokenVerificationResult & { accessToken?: string; refreshToken?: string }> {
    try {
      // Verify temp token
      const { secret: jwtSecret } = getJWTSecretSafe();
      const { payload } = await jwtVerify(tempToken, jwtSecret);

      if (payload.type !== '2fa_pending') {
        return { isValid: false, error: 'Invalid token type' };
      }

      const userId = payload.userId as string;

      const dbClient = prisma;
      if (!dbClient) throw new Error('Database client not available');

      const user = await dbClient.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return { isValid: false, error: '2FA not enabled for this user' };
      }

      // Verify TOTP
      let isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });

      // If TOTP is invalid, check recovery codes
      if (!isValid && user.recoveryCodes) {
        const recoveryCodes = JSON.parse(user.recoveryCodes as string) as string[];
        for (const hashedCode of recoveryCodes) {
          if (await bcrypt.compare(code, hashedCode)) {
            isValid = true;
            // Remove used recovery code
            const newRecoveryCodes = recoveryCodes.filter(c => c !== hashedCode);
            await dbClient.user.update({
              where: { id: userId },
              data: { recoveryCodes: JSON.stringify(newRecoveryCodes) }
            });
            break;
          }
        }
      }

      if (!isValid) {
        return { isValid: false, error: 'Invalid verification code' };
      }

      // Success - create session
      const safeUserAgent = (userAgent || 'unknown').substring(0, 500);
      const safeIp = (ip || 'unknown').substring(0, 45);

      await this.updateLastLogin(user.id);
      
      const tokens = await this.createTokens({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      });

      const session = await this.createSession(user.id, safeUserAgent, safeIp, tokens.refreshToken);

      const finalTokens = await this.createTokens({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      }, session.id);

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role || undefined,
        },
        accessToken: finalTokens.accessToken,
        refreshToken: finalTokens.refreshToken,
        sessionId: session.id,
      };

    } catch (error) {
      return { isValid: false, error: 'Verification failed' };
    }
  }

  /**
   * Disable 2FA
   */
  async disableTwoFactor(userId: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    await dbClient.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: null
      }
    });

    return true;
  }

  // ==================== DEVICE MANAGEMENT ====================

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    return dbClient.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, userId: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    // Ensure session belongs to user
    const session = await dbClient.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) return false;

    await dbClient.session.delete({
      where: { id: sessionId }
    });

    return true;
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeOtherSessions(userId: string, currentSessionId: string) {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    await dbClient.session.deleteMany({
      where: {
        userId,
        NOT: {
          id: currentSessionId
        }
      }
    });

    return true;
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
   */
  extractToken(input: NextRequest | string | null | undefined): string | null {
    if (!input) return null;
    if (typeof input === 'string') return input;

    const tokenCookie = input.cookies.get('access_token')?.value || input.cookies.get('authToken')?.value;
    if (tokenCookie) return tokenCookie;

    const authHeader = input.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  // ==================== SECURITY OPERATIONS ====================

  /**
   * Log security event
   */
  async logSecurityEvent(userId: string | null, event: string, ip: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!event || typeof event !== 'string') return;

    try {
      const dbClient = prisma;
      if (!dbClient) return;

      const logData: any = {
        id: uuidv4(),
        eventType: event,
        ip: ip || 'unknown',
        userAgent: (metadata?.userAgent as string) || '',
        deviceInfo: metadata?.deviceInfo ? JSON.stringify(metadata.deviceInfo) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      };
      if (userId) {
        logData.userId = userId;
      }
      await dbClient.securityLog.create({ data: logData });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Failed to log security event', error);
      }
    }
  }

  /**
   * Verify a JWT token and optionally check session validity
   */
  async verifyTokenFromRequest(
    request: NextRequest,
    options: { checkSession?: boolean } = {}
  ): Promise<TokenVerificationResult> {
    const token = this.extractToken(request);
    if (!token) {
      return { isValid: false, error: 'No token provided' };
    }
    return this.verifyTokenFromInput(token, options.checkSession);
  }

  /**
   * Verify token from various sources (string, request, etc.)
   */
  async verifyTokenFromInput(input: NextRequest | string | null | undefined, checkSession = false): Promise<TokenVerificationResult> {
    if (input instanceof NextRequest) {
      return this.verifyTokenFromRequest(input, { checkSession });
    }

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

        if (checkSession && sessionId) {
          const dbClient = prisma;
          if (!dbClient) throw new Error('Database client not available');

          const session = await dbClient.session.findUnique({
            where: {
              id: sessionId,
              userId: user.id,
              expiresAt: { gt: new Date() }
            }
          });

          if (!session) {
            return { isValid: false, error: 'Session not found or expired' };
          }
        }

        return { isValid: true, user, sessionId };
      } catch (error) {
        return { isValid: false, error: 'Invalid or expired token' };
      }
    }

    const token = this.extractToken(input);
    if (!token) return { isValid: false, error: 'No token provided' };

    return this.verifyTokenFromInput(token, checkSession);
  }

  /**
   * Get current user from server-side context
   */
  async getCurrentUser(): Promise<TokenVerificationResult> {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();

      const token =
        cookieStore.get('access_token')?.value ||
        cookieStore.get('authToken')?.value ||
        null;

      if (!token) return { isValid: false, error: 'No token provided in cookies' };

      return this.verifyTokenFromInput(token, true);
    } catch {
      return { isValid: false, error: 'getCurrentUser can only be used in Server Components or API Routes' };
    }
  }

  /**
   * Check if user is authenticated and session is valid
   */
  async isAuthenticated(input: NextRequest | string | null | undefined): Promise<boolean> {
    const verification = await this.verifyTokenFromInput(input);
    return verification.isValid;
  }

  // ==================== AUTHENTICATION OPERATIONS ====================

  /**
   * Get remaining recovery codes count
   */
  async getRemainingRecoveryCodesCount(userId: string): Promise<number> {
    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    const user = await dbClient.user.findUnique({
      where: { id: userId },
      select: { recoveryCodes: true }
    });

    if (!user || !user.recoveryCodes) return 0;

    try {
      const codes = JSON.parse(user.recoveryCodes as string);
      return Array.isArray(codes) ? codes.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Regenerate recovery codes
   */
  async regenerateRecoveryCodes(userId: string, count: number = 10): Promise<string[]> {
    const recoveryCodes = Array.from({ length: count }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Hash recovery codes
    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map(code => bcrypt.hash(code, 10))
    );

    const dbClient = prisma;
    if (!dbClient) throw new Error('Database client not available');

    await dbClient.user.update({
      where: { id: userId },
      data: {
        recoveryCodes: JSON.stringify(hashedRecoveryCodes)
      }
    });

    return recoveryCodes;
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
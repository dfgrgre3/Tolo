import { SignJWT, jwtVerify } from 'jose'
import { v4 as uuidv4 } from 'uuid'
/**
 * @deprecated Use auth-service.ts instead
 */
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { rateLimitingService } from '@/lib/services/rate-limiting-service'
import { getJWTSecret } from '@/lib/env-validation'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { securityAuditService } from '@/lib/services/security-audit-service'

// Constants
export const SESSION_DURATION = 30 * 24 * 60 * 60 // 30 days
export const ACCESS_TOKEN_EXPIRY = '1h'
export const REFRESH_TOKEN_EXPIRY = '30d'
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
export const MAX_LOGIN_ATTEMPTS = 5
export const ACCOUNT_LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  role?: string | null
  image?: string | null
}

export interface SessionData {
  id: string
  userId: string
  expiresAt: Date
  userAgent?: string
  ip?: string
}

export interface TokenVerificationResult {
  isValid: boolean
  user?: any
  userId?: string
  sessionId?: string
  error?: string
}

export class AuthError extends Error {
  constructor(message: string, public code: string = 'AUTH_ERROR') {
    super(message)
    this.name = 'AuthError'
  }
}

export class AuthService {
  private static instance: AuthService

  private constructor() { }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Get JWT secret securely - throws if not configured
   */
  public getSecret(): Uint8Array {
    const secret = getJWTSecret();
    if (!secret) {
      throw new AuthError('JWT_SECRET not configured', 'CONFIG_ERROR');
    }
    return new TextEncoder().encode(secret);
  }



  /**
   * Securely hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  /**
   * Verify a password against a hash
   */
  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  /**
   * Create a new user
   */
  async createUser(data: { email: string; name?: string; passwordHash: string; emailVerified?: boolean }) {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        emailVerified: data.emailVerified || false,
      },
    })
  }

  /**
   * Create access and refresh tokens
   * Security: Each token includes a unique jti (JWT ID) to prevent replay attacks
   */
  async createTokens(user: AuthUser, sessionId?: string) {
    const secret = this.getSecret()
    const accessJti = uuidv4()
    const refreshJti = uuidv4()
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    }

    const accessToken = await new SignJWT({ ...payload, type: 'access', jti: accessJti })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .setIssuer('thanawy-auth')
      .setAudience('thanawy-app')
      .sign(secret)

    const refreshToken = await new SignJWT({ ...payload, type: 'refresh', jti: refreshJti })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .setIssuer('thanawy-auth')
      .setAudience('thanawy-app')
      .sign(secret)

    return { accessToken, refreshToken, accessJti, refreshJti }
  }

  /**
   * Verify and refresh a token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const secret = this.getSecret()
      const { payload } = await jwtVerify(refreshToken, secret)

      if (payload.type !== 'refresh') {
        throw new AuthError('Invalid token type', 'INVALID_TOKEN')
      }

      const sessionId = payload.sessionId as string
      if (!sessionId) {
        throw new AuthError('Invalid token payload', 'INVALID_PAYLOAD')
      }

      // Check session in DB
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      })

      if (!session || session.refreshToken !== refreshToken) {
        throw new AuthError('Invalid session', 'INVALID_SESSION')
      }

      if (session.expiresAt < new Date()) {
        await this.deleteSession(sessionId)
        throw new AuthError('Session expired', 'SESSION_EXPIRED')
      }

      const user = session.user
      const tokens = await this.createTokens({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
        image: user.avatar || undefined,
      }, sessionId)

      // Update refresh token in DB
      await prisma.session.update({
        where: { id: sessionId },
        data: { refreshToken: tokens.refreshToken },
      })

      return {
        tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        }
      }
    } catch (error) {
      logger.error('Refresh token failed', error)
      throw error instanceof AuthError ? error : new AuthError('Token refresh failed', 'REFRESH_FAILED')
    }
  }

  /**
   * Create a new user session
   */
  /**
   * Create a new user session with limits and cleanup
   */
  async createSession(userId: string, refreshToken: string, userAgent?: string, ip?: string) {
    // 1. Lazy Cleanup: Remove expired sessions for this user
    await this.cleanupExpiredSessions(userId).catch(err =>
      logger.warn('Failed to cleanup expired sessions', { error: err })
    );

    // 2. Enforce Max Sessions Limit (e.g. 5)
    // We check count first. If >= limit, we remove the oldest session.
    const MAX_SESSIONS = 5;
    const activeSessionsCount = await prisma.session.count({
      where: { userId }
    });

    if (activeSessionsCount >= MAX_SESSIONS) {
      // Find oldest session
      const oldestSession = await prisma.session.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      });

      if (oldestSession) {
        await prisma.session.delete({
          where: { id: oldestSession.id }
        });
        logger.info('Enforced max session limit', { userId, deletedSessionId: oldestSession.id });
      }
    }

    const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000)

    return prisma.session.create({
      data: {
        id: uuidv4(),
        userId,
        refreshToken,
        expiresAt,
        userAgent: userAgent || 'unknown',
        ip: ip || 'unknown',
      },
    })
  }

  /**
   * Cleanup expired sessions for a user
   */
  async cleanupExpiredSessions(userId: string) {
    await prisma.session.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() }
      }
    });
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { lastAccessed: 'desc' }
    });
  }

  /**
   * Revoke a specific session securely (ensuring ownership)
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Delete only if it belongs to the user
      const result = await prisma.session.deleteMany({
        where: {
          id: sessionId,
          userId: userId
        }
      });
      return result.count > 0;
    } catch (error) {
      logger.error('Failed to revoke session', error);
      return false;
    }
  }

  async deleteSession(sessionId: string) {
    try {
      await prisma.session.delete({ where: { id: sessionId } })
    } catch (error) {
      // Ignore if not found
    }
  }

  /**
   * Check rate limits
   */
  async checkRateLimit(identifier: string): Promise<void> {
    const isLimited = await rateLimitingService.checkRateLimit(identifier, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutMs: ACCOUNT_LOCKOUT_MS
    })

    if (!isLimited.allowed) {
      throw new AuthError('Too many attempts. Please try again later.', 'RATE_LIMITED')
    }
  }

  async recordFailedAttempt(identifier: string) {
    await rateLimitingService.recordFailedAttempt(identifier, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutMs: ACCOUNT_LOCKOUT_MS
    })
  }

  // Two Factor Authentication
  async generateTwoFactorSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(email, 'Thanawy', secret)
    const qrCodeUrl = await QRCode.toDataURL(otpauth)

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false }
    })

    return { secret, qrCodeUrl }
  }

  async verifyTwoFactor(userId: string, token: string, isSetup = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, recoveryCodes: true, twoFactorEnabled: true }
    })

    if (!user || !user.twoFactorSecret) {
      throw new AuthError('2FA not initialized', '2FA_NOT_INIT')
    }

    if (!isSetup && !user.twoFactorEnabled) {
      throw new AuthError('2FA not enabled', '2FA_NOT_ENABLED')
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })

    if (isValid) {
      if (isSetup) {
        // Generate recovery codes
        const recoveryCodes = Array.from({ length: 10 }, () =>
          uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()
        )
        const hashedCodes = await Promise.all(recoveryCodes.map(c => bcrypt.hash(c, 10)))

        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorEnabled: true,
            recoveryCodes: JSON.stringify(hashedCodes)
          }
        })
        return { success: true, recoveryCodes }
      }
      return { success: true }
    }

    // Check recovery codes if not setup
    if (!isSetup && user.recoveryCodes) {
      const codes = JSON.parse(user.recoveryCodes) as string[]
      for (const hashedCode of codes) {
        if (await bcrypt.compare(token, hashedCode)) {
          // Consume code
          const remaining = codes.filter(c => c !== hashedCode)
          await prisma.user.update({
            where: { id: userId },
            data: { recoveryCodes: JSON.stringify(remaining) }
          })
          return { success: true, usedRecoveryCode: true }
        }
      }
    }

    throw new AuthError('Invalid 2FA code', 'INVALID_2FA')
  }
  /**
   * Get current user from cookies (Server Side)
   */
  async getCurrentUser() {
    try {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('access_token')?.value
      const refreshToken = cookieStore.get('refresh_token')?.value

      if (!accessToken && !refreshToken) {
        return { isValid: false, user: null, sessionId: null }
      }

      // 1. Try access token
      if (accessToken) {
        const payload = await this.verifyToken(accessToken)
        if (payload) {
          return {
            isValid: true,
            user: {
              id: payload.userId as string,
              email: payload.email as string,
              name: payload.name as string | undefined, // Assuming name is in payload or we fetch it?
              role: payload.role as string | undefined,
            },
            sessionId: payload.sessionId as string,
          }
        }
      }

      // 2. Try refresh token if access token failed/missing
      if (refreshToken) {
        // We can't easily rotate tokens here if called from a Server Component
        // But we can at least validate the session
        const result = await this.refreshAccessToken(refreshToken)
        if (result.user) {
          return {
            isValid: true,
            user: result.user,
            sessionId: result.tokens?.refreshToken ? undefined : undefined, // We don't have the new session ID easily if refreshAccessToken doesn't return it clearly in structure, but it returns tokens. 
            // Actually refreshAccessToken returns { tokens, user }. tokens has accessToken/refreshToken.
            // But we need the sessionId. explicit refreshAccessToken verification:
          }
        }
      }

      return { isValid: false, user: null, sessionId: null }
    } catch (error) {
      return { isValid: false, user: null, sessionId: null }
    }
  }

  /**
   * Helper to verify token (wrapper around jwtVerify to return payload or null)
   * Validates token structure, signature, issuer, and audience
   * Security: Validates both issuer and audience to prevent token misuse
   */
  async verifyToken(token: string) {
    try {
      const secret = this.getSecret()
      const { payload } = await jwtVerify(token, secret, {
        issuer: 'thanawy-auth',
        audience: 'thanawy-app'
      })

      // Validate jti exists for tokens created after this update
      if (payload.jti && typeof payload.jti !== 'string') {
        logger.warn('Token with invalid jti format', { jti: payload.jti })
        return null
      }

      return payload
    } catch (error) {
      logger.debug('Token verification failed', { error })
      return null
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(userId: string | null, eventType: string, ip: string, metadata: any = {}) {
    await securityAuditService.logSecurityEvent(userId, eventType, ip, metadata)
  }

  /**
   * Get Client IP (Helper)
   */
  getClientIP(req: NextRequest | Request): string {
    if ((req as any).ip) return (req as any).ip
    const forwardedFor = req.headers.get('x-forwarded-for')
    if (forwardedFor) return forwardedFor.split(',')[0]
    return 'unknown'
  }

  /**
   * Reset rate limit for an identifier
   */
  async resetRateLimit(identifier: string) {
    await rateLimitingService.resetRateLimit(identifier);
  }

  /**
   * Reset password for a user
   */
  async resetPassword(token: string, newPassword: string, ip: string, userAgent: string) {
    // 1. Verify token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new AuthError('Invalid or expired reset token', 'INVALID_TOKEN');
    }

    // 2. Hash new password
    const passwordHash = await AuthService.hashPassword(newPassword);

    // 3. Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        resetToken: null,
        resetTokenExpires: null
      }
    });

    // 4. Revoke all sessions for security
    await prisma.session.deleteMany({ where: { userId: user.id } });
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string, ip: string, userAgent: string) {
    // 1. Find user with token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new AuthError('Invalid or expired verification token', 'INVALID_TOKEN');
    }

    // 2. Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    await this.logSecurityEvent(user.id, 'email_verified', ip, { userAgent })
  }

  async generate2FATempToken(userId: string) {
    const secret = this.getSecret()
    return new SignJWT({ userId, type: '2fa_temp' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret)
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() }
    });
  }

  /**
   * Extract token from request (Bearer or Cookie)
   */
  extractToken(req: NextRequest | Request): string | null {
    // 1. Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Check Cookie (if available on request object)
    if ('cookies' in req) {
      return (req as NextRequest).cookies.get('access_token')?.value || null;
    }

    return null;
  }

  /**
   * Verify token from request
   */
  async verifyTokenFromRequest(req: NextRequest | Request) {
    const token = this.extractToken(req);
    if (!token) return { isValid: false, error: 'No token provided' };

    const payload = await this.verifyToken(token);
    if (!payload) return { isValid: false, error: 'Invalid token' };

    return { isValid: true, user: payload, userId: payload.userId };
  }


  /**
   * Get User Agent (Helper)
   */
  getUserAgent(req: NextRequest | Request): string {
    return req.headers.get('user-agent') || 'unknown'
  }

  /**
   * Verify token from raw input string with optional session validation
   */
  async verifyTokenFromInput(
    token: string,
    checkSession: boolean = false
  ): Promise<TokenVerificationResult> {
    try {
      // Validate token format
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return { isValid: false, error: 'No token provided' }
      }

      const tokenParts = token.split('.')
      if (tokenParts.length !== 3 || tokenParts.some(part => part.length === 0)) {
        return { isValid: false, error: 'Invalid token format' }
      }

      const payload = await this.verifyToken(token)
      if (!payload) {
        return { isValid: false, error: 'Invalid or expired token' }
      }

      const result: TokenVerificationResult = {
        isValid: true,
        userId: payload.userId as string,
        sessionId: payload.sessionId as string | undefined,
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
        }
      }

      // Optionally verify session exists and is valid
      if (checkSession && result.sessionId) {
        const session = await this.getSession(result.sessionId)
        if (!session) {
          return { isValid: false, error: 'Session not found' }
        }
        if (session.expiresAt < new Date()) {
          await this.deleteSession(result.sessionId)
          return { isValid: false, error: 'Session expired' }
        }
      }

      return result
    } catch (error) {
      logger.error('Token verification failed:', error)
      return { isValid: false, error: 'Token verification failed' }
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string) {
    try {
      return await prisma.session.findUnique({
        where: { id: sessionId }
      })
    } catch (error) {
      logger.error('Failed to get session:', error)
      return null
    }
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteAllUserSessions(userId: string): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: { userId }
      })
      logger.info('Deleted all user sessions', { userId, count: result.count })
      return result.count
    } catch (error) {
      logger.error('Failed to delete user sessions:', error)
      return 0
    }
  }

}

export const authService = AuthService.getInstance()


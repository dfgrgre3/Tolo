import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { rateLimitingService } from './rate-limiting-service';

// Use NEXTAUTH_SECRET if available for compatibility with NextAuth
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
);
const JWT_SECRET_STRING = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION || '2592000'); // 30 days in seconds

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
 * Unified Authentication Service - Single source of truth for all authentication operations
 * Consolidates functionality from multiple auth services into one centralized service
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
   */
  async createTokens(user: AuthUser, sessionId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      sessionId: sessionId || undefined,
    };

    const accessToken = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(JWT_SECRET);

    const refreshToken = await new SignJWT({
      userId: user.id,
      sessionId: sessionId || undefined,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode a JWT token
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      const user: AuthUser = {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      };

      return {
        isValid: true,
        user,
        sessionId: payload.sessionId as string,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Token verification failed',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, userAgent: string, ip: string): Promise<TokenVerificationResult & { accessToken?: string; refreshToken?: string }> {
    try {
      const { payload } = await jwtVerify(refreshToken, JWT_SECRET);
      const userId = payload.userId as string;
      const sessionId = payload.sessionId as string;

      // Validate session exists and is not expired
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId || session.expiresAt < new Date()) {
        return {
          isValid: false,
          error: 'Invalid or expired session',
        };
      }

      const user = await prisma.user.findUnique({
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
      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          expiresAt: new Date(Date.now() + SESSION_DURATION * 1000),
          userAgent,
          ip
        }
      });

      const { accessToken, refreshToken: newRefreshToken } = await this.createTokens(user, sessionId);

      return {
        isValid: true,
        user,
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
   * Find user by email
   */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID with full profile
   */
  async findUserById(id: string) {
    return prisma.user.findUnique({
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
    return prisma.user.update({
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

    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        userAgent,
        ip,
        expiresAt
      }
    });

    return session;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await prisma.session.delete({
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
    return prisma.session.findUnique({
      where: { id: sessionId }
    });
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId }
    });
  }

  // ==================== AUTHENTICATION OPERATIONS ====================

  /**
   * Authenticate user login
   */
  async login(email: string, password: string, userAgent: string, ip: string): Promise<TokenVerificationResult & { accessToken?: string; refreshToken?: string }> {
    const clientId = `${ip}-${userAgent}`;

    // Check rate limiting
    if (await this.isRateLimited(clientId)) {
      return {
        isValid: false,
        error: 'Too many login attempts. Account temporarily locked.',
      };
    }

    const user = await this.findUserByEmail(email);
    if (!user) {
      await this.recordFailedAttempt(clientId);
      return {
        isValid: false,
        error: 'Invalid credentials',
      };
    }

    const isValid = await AuthService.comparePasswords(password, user.passwordHash);
    if (!isValid) {
      await this.recordFailedAttempt(clientId);
      return {
        isValid: false,
        error: 'Invalid credentials',
      };
    }

    await this.updateLastLogin(user.id);

    // Reset rate limiting on successful login
    await this.resetRateLimit(clientId);

    // Create a new session
    const session = await this.createSession(user.id, userAgent, ip);

    const { accessToken, refreshToken } = await this.createTokens({
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

    const user = await prisma.user.create({
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
   */
  extractToken(input: NextRequest | string | null | undefined): string | null {
    if (!input) {
      return null;
    }

    if (typeof input === 'string') {
      return input;
    }

    const authHeader = input.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Support token passed via cookie for SSR utilities
    const tokenCookie = input.cookies.get('authToken')?.value || input.cookies.get('access_token')?.value;
    if (tokenCookie) {
      return tokenCookie;
    }

    return null;
  }

  // ==================== SECURITY OPERATIONS ====================

  /**
   * Log security event
   */
  async logSecurityEvent(userId: string | null, event: string, ip: string, metadata?: any): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          userId,
          eventType: event,
          ip,
          userAgent: metadata?.userAgent || '',
          deviceInfo: metadata?.deviceInfo ? JSON.stringify(metadata.deviceInfo) : null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Verify a JWT token and optionally check session validity
   * @param request NextRequest object
   * @param options Verification options
   * @returns TokenVerificationResult with user data or error
   */
  async verifyTokenFromRequest(
    request: NextRequest,
    options: {
      checkSession?: boolean; // Whether to check session validity in DB
    } = {}
  ): Promise<TokenVerificationResult> {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          isValid: false,
          error: 'No valid authorization header'
        };
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Verify token signature using jose
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
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
          const session = await prisma.session.findUnique({
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
      console.error('Token verification error:', error);
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
        const { payload } = await jwtVerify(input, JWT_SECRET);
        
        const user: AuthUser = {
          id: payload.userId as string,
          email: payload.email as string,
          name: payload.name as string,
          role: payload.role as string,
        };

        let sessionId: string | undefined = payload.sessionId as string;

        // Check session validity if requested
        if (checkSession && sessionId) {
          const session = await prisma.session.findUnique({
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
        console.error('Token verification error:', error);
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
   */
  async getCurrentUser(): Promise<TokenVerificationResult> {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('authToken')?.value ||
      cookieStore.get('access_token')?.value ||
      null;

    if (!token) {
      return {
        isValid: false,
        error: 'No token provided',
      };
    }

    // Verify token and check session validity
    return this.verifyTokenFromInput(token, true);
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
  if (!token || !JWT_SECRET_STRING) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_STRING) as JwtPayload & DecodedToken;

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
    console.error('JWT verification failed:', error);
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
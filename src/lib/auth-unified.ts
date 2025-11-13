import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { rateLimitingService } from './rate-limiting-service';
import { getJWTSecret } from './env-validation';
import { logger } from './logger';

// SessionData interface - exported for use in other modules
export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  expiresAt: Date;
  createdAt: Date;
}

// Get validated JWT_SECRET (throws error in production if invalid)
let JWT_SECRET: Uint8Array;
let JWT_SECRET_STRING: string;

// Lazy initialization to avoid throwing errors during module load
function getJWTSecretSafe(): { secret: Uint8Array; secretString: string } {
  if (!JWT_SECRET || !JWT_SECRET_STRING) {
    try {
      JWT_SECRET_STRING = getJWTSecret();
      JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
    } catch (error) {
      // In development, use a warning but allow continuation
      if (process.env.NODE_ENV === 'development') {
        logger.warn('JWT_SECRET not properly configured. Using fallback for development only.');
        JWT_SECRET_STRING = 'fallback-jwt-secret-for-dev-only-PLEASE-SET-IN-PRODUCTION';
        JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
      } else {
        throw error;
      }
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

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async createTokens(user: AuthUser, sessionId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
    };

    // Create access token (1 hour expiration)
    const { secret } = getJWTSecretSafe();
    const accessToken = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    // Create refresh token (30 days expiration)
    const refreshToken = await new SignJWT({ userId: user.id, sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    return { accessToken, refreshToken };
  }

  static async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const { secret } = getJWTSecretSafe();
      const { payload } = await jwtVerify(token, secret);
      return {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string | undefined,
        role: payload.role as string | undefined,
      };
    } catch (error) {
      logger.error('Token verification failed', error);
      return null;
    }
  }

  static async verifyAccessToken(token: string): Promise<AuthUser | null> {
    try {
      // First try to verify with jose
      const { secret } = getJWTSecretSafe();
      const { payload } = await jwtVerify(token, secret);
      
      // Validate required fields
      if (!payload.userId || !payload.email) {
        return null;
      }
      
      return {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string | undefined,
        role: payload.role as string | undefined,
      };
    } catch (error) {
      logger.error('Access token verification failed', error);
      return null;
    }
  }

  static async verifyRefreshToken(token: string): Promise<{ userId: string; sessionId?: string } | null> {
    try {
      const { secret } = getJWTSecretSafe();
      const { payload } = await jwtVerify(token, secret);
      
      if (!payload.userId) {
        return null;
      }
      
      return {
        userId: payload.userId as string,
        sessionId: payload.sessionId as string | undefined,
      };
    } catch (error) {
      logger.error('Refresh token verification failed', error);
      return null;
    }
  }

  static async createSession(
    userId: string,
    userAgent: string,
    ip: string
  ): Promise<SessionData> {
    const sessionId = uuidv4();
    
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        userAgent,
        ip,
        deviceInfo: userAgent, // In a more advanced implementation, you might parse the userAgent
        expiresAt: new Date(Date.now() + SESSION_DURATION * 1000),
      },
    });
    
    return {
      id: session.id,
      userId: session.userId,
      userAgent: session.userAgent,
      ip: session.ip,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  static async validateSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) return false;
      
      // Check if session belongs to user
      if (session.userId !== userId) return false;
      
      // Check if session is expired
      if (session.expiresAt < new Date()) return false;
      
      // Check if session is active
      if (!session.isActive) return false;
      
      // Update last accessed time
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastAccessed: new Date() },
      });
      
      return true;
    } catch (error) {
      logger.error('Session validation failed', error);
      return false;
    }
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false },
      });
    } catch (error) {
      logger.error('Session invalidation failed', error);
    }
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    } catch (error) {
      logger.error('All user sessions invalidation failed', error);
    }
  }

  static async refreshSession(refreshToken: string): Promise<{ accessToken: string; newRefreshToken: string } | null> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      if (!decoded) return null;

      const { userId, sessionId } = decoded;

      // If we have a session ID, validate it
      if (sessionId) {
        const isValidSession = await this.validateSession(sessionId, userId);
        if (!isValidSession) return null;
      }

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      if (!user) return null;

      // Create new tokens
      const { accessToken, refreshToken: newRefreshToken } = await this.createTokens(
        {
          id: user.id,
          email: user.email!,
          name: user.name || undefined,
          role: user.role || undefined,
        },
        sessionId
      );

      return { accessToken, newRefreshToken };
    } catch (error) {
      logger.error('Session refresh failed', error);
      return null;
    }
  }

  static async checkRateLimit(identifier: string): Promise<{ allowed: boolean; remainingTime?: number }> {
    try {
      const rateLimitResult = await rateLimitingService.checkRateLimit(identifier, {
        windowMs: RATE_LIMIT_WINDOW_MS,
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        lockoutMs: ACCOUNT_LOCKOUT_MS,
      });

      return {
        allowed: rateLimitResult.allowed,
        remainingTime: rateLimitResult.remainingTime,
      };
    } catch (error) {
      logger.error('Rate limiting check failed', error);
      // In case of Redis failure, allow the request but log it
      return { allowed: true };
    }
  }

  static async incrementRateLimit(identifier: string): Promise<void> {
    try {
      await rateLimitingService.incrementAttempts(identifier);
    } catch (error) {
      logger.error('Rate limiting increment failed', error);
    }
  }

  static async resetRateLimit(identifier: string): Promise<void> {
    try {
      await rateLimitingService.resetAttempts(identifier);
    } catch (error) {
      logger.error('Rate limiting reset failed', error);
    }
  }

  static async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        emailVerified: true,
      },
    });
  }
}

// Export DecodedToken interface for use in other modules
export interface DecodedToken {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  sessionId?: string;
}

// Helper function to extract token from request or string
function extractToken(input: NextRequest | string | null | undefined): string | null {
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

/**
 * Verify JWT token and return decoded token data
 * This is a convenience function for backward compatibility
 */
export function verifyToken(input: NextRequest | string | null | undefined): DecodedToken | null {
  const token = extractToken(input);
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
    };
  } catch (error) {
    logger.error('JWT verification failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get authenticated user from cookies
 * This is a convenience function for backward compatibility
 */
export async function auth(): Promise<{ user: DecodedToken } | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get('authToken')?.value ||
    cookieStore.get('access_token')?.value ||
    null;

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  // Verify session is still valid if sessionId is present
  if (decoded.sessionId) {
    const isValidSession = await AuthService.validateSession(decoded.sessionId, decoded.userId);
    if (!isValidSession) {
      return null;
    }
  }

  return { user: decoded };
}
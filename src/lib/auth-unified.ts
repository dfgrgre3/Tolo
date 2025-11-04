import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { rateLimitingService } from './rate-limiting-service';

// SessionData interface - exported for use in other modules
export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  expiresAt: Date;
  createdAt: Date;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 
  process.env.NEXTAUTH_SECRET ||
  (() => {
    console.error('JWT_SECRET is not defined in environment variables');
    return 'fallback-jwt-secret-for-dev-only'; // Only for development
  })()
);

const JWT_SECRET_STRING = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-jwt-secret-for-dev-only';
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
    const accessToken = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(JWT_SECRET);

    // Create refresh token (30 days expiration)
    const refreshToken = await new SignJWT({ userId: user.id, sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    return { accessToken, refreshToken };
  }

  static async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string | undefined,
        role: payload.role as string | undefined,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  static async verifyAccessToken(token: string): Promise<AuthUser | null> {
    try {
      // First try to verify with jose
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
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
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  static async verifyRefreshToken(token: string): Promise<{ userId: string; sessionId?: string } | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      if (!payload.userId) {
        return null;
      }
      
      return {
        userId: payload.userId as string,
        sessionId: payload.sessionId as string | undefined,
      };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
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
      console.error('Session validation failed:', error);
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
      console.error('Session invalidation failed:', error);
    }
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    } catch (error) {
      console.error('All user sessions invalidation failed:', error);
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
      console.error('Session refresh failed:', error);
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
      console.error('Rate limiting check failed:', error);
      // In case of Redis failure, allow the request but log it
      return { allowed: true };
    }
  }

  static async incrementRateLimit(identifier: string): Promise<void> {
    try {
      await rateLimitingService.incrementAttempts(identifier);
    } catch (error) {
      console.error('Rate limiting increment failed:', error);
    }
  }

  static async resetRateLimit(identifier: string): Promise<void> {
    try {
      await rateLimitingService.resetAttempts(identifier);
    } catch (error) {
      console.error('Rate limiting reset failed:', error);
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
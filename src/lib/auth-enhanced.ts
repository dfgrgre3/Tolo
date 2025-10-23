import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { rateLimitingService } from './rate-limiting-service';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'your-secret-key';
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

  static async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      };
    } catch {
      return null;
    }
  }

  static async refreshAccessToken(refreshToken: string, userAgent: string, ip: string): Promise<{ accessToken: string; refreshToken: string; sessionId: string } | null> {
    try {
      const { payload } = await jwtVerify(refreshToken, JWT_SECRET);
      const userId = payload.userId as string;
      const sessionId = payload.sessionId as string;

      // Validate session exists and is not expired
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId || session.expiresAt < new Date()) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!user) return null;

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
        accessToken,
        refreshToken: newRefreshToken,
        sessionId
      };
    } catch {
      return null;
    }
  }

  static async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findUserById(id: string) {
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

  static async updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() }
    });
  }

  static async createSession(userId: string, userAgent: string, ip: string): Promise<SessionData> {
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

  static async deleteSession(sessionId: string) {
    try {
      await prisma.session.delete({
        where: { id: sessionId }
      });
      return true;
    } catch {
      return false;
    }
  }

  static async isRateLimited(clientId: string): Promise<boolean> {
    const rateLimitResult = await rateLimitingService.checkRateLimit(clientId, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutMs: ACCOUNT_LOCKOUT_MS
    });
    
    return !rateLimitResult.allowed;
  }

  static async recordFailedAttempt(clientId: string): Promise<void> {
    await rateLimitingService.recordFailedAttempt(clientId, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutMs: ACCOUNT_LOCKOUT_MS
    });
  }

  static async resetRateLimit(clientId: string): Promise<void> {
    await rateLimitingService.resetRateLimit(clientId);
  }

  static async login(email: string, password: string, userAgent: string, ip: string): Promise<LoginResult | null> {
    const clientId = `${ip}-${userAgent}`;
    
    // Check rate limiting
    if (await this.isRateLimited(clientId)) {
      throw new Error('Too many login attempts. Account temporarily locked.');
    }
    
    const user = await this.findUserByEmail(email);
    if (!user) {
      await this.recordFailedAttempt(clientId);
      return null;
    }

    const isValid = await this.comparePasswords(password, user.passwordHash);
    if (!isValid) {
      await this.recordFailedAttempt(clientId);
      return null;
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      },
      accessToken,
      refreshToken,
    };
  }

  static async register(email: string, password: string, name?: string): Promise<AuthUser | null> {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await this.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || undefined,
    };
  }

  static getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }

  static getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  static async logSecurityEvent(userId: string | null, event: string, ip: string, metadata?: any) {
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
}

export default AuthService;

export interface DecodedToken {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  sessionId?: string;
}

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

export function verifyToken(input: NextRequest | string | null | undefined): DecodedToken | null {
  const token = extractToken(input);
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
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function auth(): Promise<{ user: DecodedToken } | null> {
  const cookieStore = cookies();
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

  // Verify session is still valid
  if (decoded.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
  }

  return { user: decoded };
}

// This file is deprecated. Please use auth-unified.ts instead.
export * from './auth-unified';

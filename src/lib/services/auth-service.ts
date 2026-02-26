import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { RegisterInput } from "@/lib/validations/auth";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { getJWTSecret } from "@/lib/env-validation";
import { CacheService } from "@/lib/cache-service-unified";
import { emailPasswordProvider } from "@/lib/auth/providers/email-password.provider";
import { v4 as uuidv4 } from 'uuid';

// --- Constants ---
const JWT_SECRET = new TextEncoder().encode(getJWTSecret());
const SALT_ROUNDS = 12;
const USER_CACHE_TTL = 3600; // 1 hour

// --- Types ---
export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  [key: string]: unknown;
}

export interface CachedUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface TokenVerificationResult {
  isValid: boolean;
  user?: UserPayload;
  sessionId?: string;
  error?: string;
}

// --- Auth Service Class ---

export class AuthService {
  private static instance: AuthService;

  private constructor() { }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ===== Basic Cryptography & Tokens =====

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(plain, hashed);
  }

  async generateToken(payload: UserPayload, expiresIn: string = "7d"): Promise<string> {
    return await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(JWT_SECRET);
  }

  async generate2FATempToken(payload: any): Promise<string> {
    return await new SignJWT({ ...payload, type: "2fa_temp" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(JWT_SECRET);
  }

  // ===== User Management & Caching =====

  async getOrSetUserCache(email: string, fetcher: () => Promise<CachedUser | null>): Promise<CachedUser | null> {
    const cacheKey = `user:${email.toLowerCase()}`;
    return await CacheService.getOrSet(cacheKey, fetcher, USER_CACHE_TTL);
  }

  async invalidateUserCache(email: string): Promise<void> {
    const cacheKey = `user:${email.toLowerCase()}`;
    await CacheService.del(cacheKey);
  }

  async getUserByEmail(email: string): Promise<CachedUser | null> {
    const normalizedEmail = email.toLowerCase().trim();

    return this.getOrSetUserCache(normalizedEmail, async () => {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          role: true,
          emailVerified: true,
          twoFactorEnabled: true,
        }
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role || 'user',
        emailVerified: user.emailVerified || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
      };
    });
  }

  async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        totalXP: true,
        level: true,
      }
    });
  }

  // ===== Session Management =====

  async createSession(userId: string, refreshToken: string, userAgent: string, ip: string, remember: boolean = false) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (remember ? 30 : 1));

    return await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        refreshToken,
        userAgent: userAgent.substring(0, 500),
        ip: ip.substring(0, 45),
        expiresAt,
        isActive: true,
      },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      await prisma.session.deleteMany({
        where: { id: sessionId, userId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        userId,
        id: exceptSessionId ? { not: exceptSessionId } : undefined
      }
    });
  }

  // ===== Verification & Token Handling =====

  async verifyToken(token: string): Promise<UserPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as unknown as UserPayload;
    } catch (error) {
      return null;
    }
  }

  // ===== Higher Level Operations (Merged from Login/Register) =====

  async authenticate(input: { email: string; password: string }) {
    return await emailPasswordProvider.authenticate(input);
  }

  async register(data: RegisterInput): Promise<{ user: any; verificationToken: string }> {
    const hashedPassword = await this.hashPassword(data.password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: data.email.toLowerCase().trim(),
        name: data.name,
        passwordHash: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        emailVerified: false,
        role: 'user',
      }
    });

    return { user, verificationToken };
  }
}

export const authService = AuthService.getInstance();
export default authService;

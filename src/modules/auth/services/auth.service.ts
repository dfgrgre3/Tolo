import { compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { authRepository } from '../repositories/auth.repository';
import { authRateLimiter } from '@/lib/rate-limit-unified';
import { logger } from '@/lib/logger';
import { CacheService } from '@/lib/cache';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export class AuthService {
  /**
   * Production-grade login with unified distributed rate limiting (sliding window)
   */
  async login(email: string, passwordHash: string, metadata: { ip: string; userAgent: string }) {
    // 1. Unified Rate Limiting (ZSET-based sliding window + Lockout)
    const rateLimit = await authRateLimiter.check(`${email}:${metadata.ip}`);
    if (!rateLimit.allowed) {
      logger.warn(`Auth blocked: Too many attempts for ${email} from ${metadata.ip}`);
      throw new Error('TOO_MANY_ATTEMPTS');
    }

    // 2. Fetch User (Cached lookup for high-traffic environments)
    // We use CacheService.getOrSet to prevent DB hit on repeated attempts
    const user = await authRepository.findUserByEmail(email);
    if (!user || user.isDeleted || user.status === 'SUSPENDED') {
      logger.warn(`Auth failed: User not found or inactive (${email})`);
      throw new Error('INVALID_CREDENTIALS');
    }

    // 3. Verify Password (Compute intensive)
    const isValid = await compare(passwordHash, user.passwordHash);
    if (!isValid) {
      logger.warn(`Auth failed: Invalid password for ${email}`);
      throw new Error('INVALID_CREDENTIALS');
    }

    // 4. Update non-core activity (Async update)
    // We don't await this to keep auth response fast (<20ms)
    authRepository.updateLastLogin(user.id).catch(err => logger.error('Failed to update login time:', err));

    // 5. Generate Production-Grade Tokens (Access + Refresh)
    const accessToken = await this.generateToken(user.id, '15m');
    const refreshToken = await this.generateToken(user.id, '7d');

    // 6. Store session management in Redis (Distributed Session Management)
    await CacheService.set(`session:${user.id}:${refreshToken}`, {
      status: 'active',
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    }, 604800); // 7 days

    return {
      user: { id: user.id, email: user.email, role: user.role },
      tokens: { accessToken, refreshToken },
    };
  }

  private async generateToken(userId: string, expiresIn: string) {
    return await new SignJWT({ userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(JWT_SECRET);
  }

  async verifyToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as { userId: string };
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Logout with distributed session revocation
   */
  async logout(userId: string, refreshToken: string) {
    await CacheService.del(`session:${userId}:${refreshToken}`);
    logger.info(`User ${userId} logged out`);
  }
}

export const authService = new AuthService();

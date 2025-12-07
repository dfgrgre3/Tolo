import { prisma } from '@/lib/db';

import { logger } from '@/lib/logger';

/**
 * Service for managing temporary authentication challenges
 * Replaces in-memory storage for serverless compatibility
 */

export interface TwoFactorChallengeData {
  id: string;
  userId?: string;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface BiometricChallengeData {
  id: string;
  challenge: string;
  type: 'register' | 'authenticate';
  userId?: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Two-Factor Authentication Challenge Management
 */
export class TwoFactorChallengeService {
  /**
   * Create a new 2FA challenge
   */
  static async createChallenge(userId: string, code: string, expiresInMinutes = 10): Promise<string> {
    // Clean up expired challenges first
    await this.cleanupExpiredChallenges();

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const challenge = await prisma.twoFactorChallenge.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        code,
        expiresAt
      }
    });

    return challenge.id;
  }

  /**
   * Get a 2FA challenge by ID
   */
  static async getChallenge(challengeId: string): Promise<TwoFactorChallengeData | null> {
    const challenge = await prisma.twoFactorChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) return null;

    return {
      id: challenge.id,
      userId: challenge.userId || undefined,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      used: challenge.used,
      createdAt: challenge.createdAt,
    };
  }

  /**
   * Verify and consume a 2FA challenge
   * Improved with timeout protection, better error handling, and security
   * Enhanced with comprehensive input validation
   */
  static async verifyAndConsumeChallenge(challengeId: string, code: string): Promise<{ valid: boolean; userId?: string }> {
    // Enhanced input validation
    if (!challengeId || typeof challengeId !== 'string' || challengeId.trim().length === 0) {
      logger.debug('Invalid challenge ID provided');
      return { valid: false };
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      logger.debug('Invalid code provided');
      return { valid: false };
    }

    // Validate code format (should be 6 digits)
    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
      logger.debug('Invalid code format provided');
      return { valid: false };
    }

    // Validate challenge ID format (should be a valid UUID or similar)
    const trimmedChallengeId = challengeId.trim();
    if (trimmedChallengeId.length < 10 || trimmedChallengeId.length > 100) {
      logger.debug('Invalid challenge ID format');
      return { valid: false };
    }

    try {
      // Fetch challenge with timeout
      const challengePromise = prisma.twoFactorChallenge.findUnique({
        where: { id: challengeId }
      });

      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000); // 3 second timeout
      });

      const challenge = await Promise.race([challengePromise, timeoutPromise]);

      if (!challenge) {
        return { valid: false };
      }

      // Check if expired
      if (new Date() > challenge.expiresAt) {
        // Clean up expired challenge (non-blocking)
        this.deleteChallenge(challengeId).catch(() => {
          // Ignore cleanup errors
        });
        return { valid: false };
      }

      // Check if already used
      if (challenge.used) {
        return { valid: false };
      }

      // Verify code with trimmed comparison
      // Note: For better security, constant-time comparison would be ideal,
      // but for 6-digit codes this is acceptable
      const challengeCode = challenge.code.trim();
      const providedCode = trimmedCode;
      
      if (challengeCode !== providedCode) {
        // Log failed attempt for security monitoring (non-blocking)
        logger.debug('2FA code verification failed', {
          challengeId: trimmedChallengeId.substring(0, 8) + '...',
          timestamp: new Date().toISOString(),
        });
        return { valid: false };
      }

      // Mark as used and return user ID (with timeout)
      const updatePromise = prisma.twoFactorChallenge.update({
        where: { id: challengeId },
        data: { used: true }
      });

      const updateTimeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 2000); // 2 second timeout
      });

      await Promise.race([updatePromise, updateTimeoutPromise]);

      return { valid: true, userId: challenge.userId || undefined };
    } catch (error) {
      logger.error('Error verifying 2FA challenge:', error);
      return { valid: false };
    }
  }

  /**
   * Delete a specific challenge
   */
  static async deleteChallenge(challengeId: string): Promise<void> {
    await prisma.twoFactorChallenge.delete({
      where: { id: challengeId }
    }).catch(() => {
      // Ignore errors if challenge doesn't exist
    });
  }

  /**
   * Clean up expired challenges
   */
  static async cleanupExpiredChallenges(): Promise<number> {
    const result = await prisma.twoFactorChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }

  /**
   * Clean up challenges for a specific user
   */
  static async cleanupUserChallenges(userId: string): Promise<number> {
    const result = await prisma.twoFactorChallenge.deleteMany({
      where: { userId }
    });

    return result.count;
  }
}

/**
 * Biometric Authentication Challenge Management
 */
export class BiometricChallengeService {
  /**
   * Create a new biometric challenge
   */
  static async createChallenge(
    challenge: string,
    type: 'register' | 'authenticate',
    userId?: string,
    expiresInMinutes = 5
  ): Promise<string> {
    // Clean up expired challenges first
    await this.cleanupExpiredChallenges();

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const biometricChallenge = await prisma.biometricChallenge.create({
      data: {
        id: crypto.randomUUID(),
        challenge,
        type,
        userId,
        expiresAt
      }
    });

    return biometricChallenge.id;
  }

  /**
   * Get a biometric challenge by ID
   */
  static async getChallenge(challengeId: string): Promise<BiometricChallengeData | null> {
    const challenge = await prisma.biometricChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) return null;

    return {
      id: challenge.id,
      challenge: challenge.challenge,
      type: challenge.type as 'register' | 'authenticate',
      userId: challenge.userId || undefined,
      expiresAt: challenge.expiresAt,
      used: challenge.used,
      createdAt: challenge.createdAt,
    };
  }

  /**
   * Verify and consume a biometric challenge
   */
  static async verifyAndConsumeChallenge(challengeId: string, expectedChallenge: string): Promise<{ valid: boolean; type?: string; userId?: string }> {
    const challenge = await prisma.biometricChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return { valid: false };
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      await this.deleteChallenge(challengeId);
      return { valid: false };
    }

    // Check if already used
    if (challenge.used) {
      return { valid: false };
    }

    // Verify challenge
    if (challenge.challenge !== expectedChallenge) {
      return { valid: false };
    }

    // Mark as used and return challenge info
    await prisma.biometricChallenge.update({
      where: { id: challengeId },
      data: { used: true }
    });

    return {
      valid: true,
      type: challenge.type,
      userId: challenge.userId || undefined
    };
  }

  /**
   * Delete a specific challenge
   */
  static async deleteChallenge(challengeId: string): Promise<void> {
    await prisma.biometricChallenge.delete({
      where: { id: challengeId }
    }).catch(() => {
      // Ignore errors if challenge doesn't exist
    });
  }

  /**
   * Clean up expired challenges
   */
  static async cleanupExpiredChallenges(): Promise<number> {
    const result = await prisma.biometricChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }

  /**
   * Clean up challenges for a specific user
   */
  static async cleanupUserChallenges(userId: string): Promise<number> {
    const result = await prisma.biometricChallenge.deleteMany({
      where: { userId }
    });

    return result.count;
  }
}

/**
 * Background cleanup service
 * In a production environment, this would run as a cron job or scheduled task
 */
export class AuthChallengesCleanupService {
  /**
   * Clean up all expired challenges
   */
  static async cleanupAllExpired(): Promise<{ twoFactor: number; biometric: number }> {
    const twoFactorCount = await TwoFactorChallengeService.cleanupExpiredChallenges();
    const biometricCount = await BiometricChallengeService.cleanupExpiredChallenges();

    return {
      twoFactor: twoFactorCount,
      biometric: biometricCount
    };
  }

  /**
   * Start periodic cleanup (for development/testing)
   * In production, use a proper scheduler
   */
  static startPeriodicCleanup(intervalMinutes = 30): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        await this.cleanupAllExpired();
        logger.info('Auth challenges cleanup completed');
      } catch (error) {
        logger.error('Auth challenges cleanup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

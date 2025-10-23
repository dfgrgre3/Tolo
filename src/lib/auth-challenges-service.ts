import { prisma } from '@/lib/prisma';

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

    return challenge;
  }

  /**
   * Verify and consume a 2FA challenge
   */
  static async verifyAndConsumeChallenge(challengeId: string, code: string): Promise<{ valid: boolean; userId?: string }> {
    const challenge = await prisma.twoFactorChallenge.findUnique({
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

    // Verify code
    if (challenge.code !== code) {
      return { valid: false };
    }

    // Mark as used and return user ID
    await prisma.twoFactorChallenge.update({
      where: { id: challengeId },
      data: { used: true }
    });

    return { valid: true, userId: challenge.userId || undefined };
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

    return challenge;
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
        console.log('Auth challenges cleanup completed');
      } catch (error) {
        console.error('Auth challenges cleanup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

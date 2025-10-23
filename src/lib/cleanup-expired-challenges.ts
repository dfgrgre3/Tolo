/**
 * Cleanup script for expired authentication challenges
 * This should be run periodically to clean up expired challenges
 * In production, this would be run as a cron job or scheduled task
 */

import { AuthChallengesCleanupService } from './auth-challenges-service';

/**
 * Main cleanup function
 */
export async function cleanupExpiredChallenges(): Promise<{
  twoFactor: number;
  biometric: number;
  total: number;
}> {
  try {
    const result = await AuthChallengesCleanupService.cleanupAllExpired();

    const total = result.twoFactor + result.biometric;

    console.log(`Cleanup completed: ${total} expired challenges removed (${result.twoFactor} 2FA, ${result.biometric} biometric)`);

    return {
      ...result,
      total
    };
  } catch (error) {
    console.error('Failed to cleanup expired challenges:', error);
    throw error;
  }
}

/**
 * Cleanup function that can be called from API routes for manual cleanup
 */
export async function manualCleanup(): Promise<{
  success: boolean;
  cleaned: number;
  error?: string;
}> {
  try {
    const result = await cleanupExpiredChallenges();

    return {
      success: true,
      cleaned: result.total
    };
  } catch (error) {
    return {
      success: false,
      cleaned: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Recovery Codes Service
 * خدمة رموز الاسترداد للـ 2FA
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Generate recovery codes
 * @param count Number of codes to generate (default: 10)
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const randomBytes = crypto.randomBytes(4);
    const code = randomBytes
      .toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 8)
      .toUpperCase();

    // Format: XXXX-XXXX
    const formatted = code.substring(0, 4) + '-' + code.substring(4, 8);
    codes.push(formatted);
  }

  return codes;
}

/**
 * Hash recovery code for storage
 * Security: Uses bcrypt instead of sha256 for better protection against rainbow tables
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  // Normalize: remove dashes and convert to uppercase
  const cleanCode = code.replace(/-/g, '').toUpperCase();
  return bcrypt.hash(cleanCode, 10);
}

/**
 * Verify recovery code using timing-safe comparison
 * Security: Uses bcrypt.compare which is timing-safe
 */
export async function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; matchedIndex: number }> {
  const cleanCode = code.replace(/-/g, '').toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    try {
      const isMatch = await bcrypt.compare(cleanCode, hashedCodes[i]);
      if (isMatch) {
        return { valid: true, matchedIndex: i };
      }
    } catch (error) {
      // Continue checking other codes if one fails
      logger.debug('Error comparing recovery code', { index: i });
    }
  }

  return { valid: false, matchedIndex: -1 };
}

/**
 * Generate and store recovery codes for user
 * Security: Codes are hashed with bcrypt before storage
 */
export async function generateAndStoreRecoveryCodes(
  userId: string,
  count: number = 10
): Promise<string[]> {
  const codes = generateRecoveryCodes(count);

  // Hash all codes with bcrypt (async)
  const hashedCodes = await Promise.all(codes.map(code => hashRecoveryCode(code)));

  // Replace existing codes (don't merge - regeneration means new set)
  await prisma.user.update({
    where: { id: userId },
    data: {
      recoveryCodes: JSON.stringify(hashedCodes),
    },
  });

  logger.info('Recovery codes generated', { userId, count });

  // Return plain codes (only shown once!)
  return codes;
}

/**
 * Verify and consume recovery code
 * Security: Uses bcrypt for timing-safe comparison
 */
export async function verifyAndConsumeRecoveryCode(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { recoveryCodes: true },
  });

  if (!user || !user.recoveryCodes) {
    return false;
  }

  try {
    const hashedCodes: string[] = JSON.parse(user.recoveryCodes as string);

    const { valid, matchedIndex } = await verifyRecoveryCode(code, hashedCodes);

    if (!valid) {
      return false;
    }

    // Remove used code by index
    const remainingCodes = hashedCodes.filter((_, index) => index !== matchedIndex);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        recoveryCodes: remainingCodes.length > 0
          ? JSON.stringify(remainingCodes)
          : null,
      },
    });

    logger.info('Recovery code consumed', { userId, remainingCount: remainingCodes.length });
    return true;
  } catch (error) {
    logger.error('Error verifying recovery code', { userId, error });
    return false;
  }
}

/**
 * Get remaining recovery codes count
 */
export async function getRemainingRecoveryCodesCount(
  userId: string
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { recoveryCodes: true },
  });

  if (!user || !user.recoveryCodes) {
    return 0;
  }

  try {
    const hashedCodes: string[] = JSON.parse(user.recoveryCodes as string);
    return hashedCodes.length;
  } catch {
    return 0;
  }
}

/**
 * Regenerate recovery codes (replaces existing ones)
 */
export async function regenerateRecoveryCodes(
  userId: string,
  count: number = 10
): Promise<string[]> {
  const codes = generateRecoveryCodes(count);
  const hashedCodes = codes.map(hashRecoveryCode);

  await prisma.user.update({
    where: { id: userId },
    data: {
      recoveryCodes: JSON.stringify(hashedCodes),
    },
  });

  return codes;
}


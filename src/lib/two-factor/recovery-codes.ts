/**
 * Recovery Codes Service
 * خدمة رموز الاسترداد للـ 2FA
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

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
 */
export function hashRecoveryCode(code: string): string {
  // Remove dashes for hashing
  const cleanCode = code.replace(/-/g, '');
  return crypto.createHash('sha256').update(cleanCode).digest('hex');
}

/**
 * Verify recovery code
 */
export function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): boolean {
  const hashedCode = hashRecoveryCode(code);
  return hashedCodes.includes(hashedCode);
}

/**
 * Generate and store recovery codes for user
 */
export async function generateAndStoreRecoveryCodes(
  userId: string,
  count: number = 10
): Promise<string[]> {
  const codes = generateRecoveryCodes(count);
  const hashedCodes = codes.map(hashRecoveryCode);

  // Get existing recovery codes (if any)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { recoveryCodes: true },
  });

  // Parse existing codes or use empty array
  let existingHashedCodes: string[] = [];
  if (user?.recoveryCodes) {
    try {
      existingHashedCodes = JSON.parse(user.recoveryCodes as string);
    } catch {
      existingHashedCodes = [];
    }
  }

  // Merge with new codes
  const allHashedCodes = [...existingHashedCodes, ...hashedCodes];

  // Store hashed codes
  await prisma.user.update({
    where: { id: userId },
    data: {
      recoveryCodes: JSON.stringify(allHashedCodes),
    },
  });

  // Return plain codes (only shown once!)
  return codes;
}

/**
 * Verify and consume recovery code
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
    
    if (!verifyRecoveryCode(code, hashedCodes)) {
      return false;
    }

    // Remove used code
    const hashedCode = hashRecoveryCode(code);
    const remainingCodes = hashedCodes.filter((h) => h !== hashedCode);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        recoveryCodes: remainingCodes.length > 0 
          ? JSON.stringify(remainingCodes) 
          : null,
      },
    });

    return true;
  } catch {
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


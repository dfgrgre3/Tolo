/**
 * TOTP (Time-based One-Time Password) Service
 * خدمة المصادقة الثنائية باستخدام تطبيقات المصادقة مثل Google Authenticator
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Base32 encoding functions (needed for TOTP)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += buffer[i].toString(2).padStart(8, '0');
  }

  let encoded = '';
  for (let i = 0; i < binary.length; i += 5) {
    const chunk = binary.slice(i, i + 5);
    const index = parseInt(chunk.padEnd(5, '0'), 2);
    encoded += BASE32_CHARS[index];
  }

  // Add padding if needed
  const padding = (8 - (encoded.length % 8)) % 8;
  return encoded + '='.repeat(padding);
}

function base32Decode(encoded: string): Buffer {
  // Remove padding
  encoded = encoded.replace(/=+$/, '').toUpperCase();

  let binary = '';
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) throw new Error(`Invalid Base32 character: ${char}`);
    binary += index.toString(2).padStart(5, '0');
  }

  // Convert binary to bytes
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i += 8) {
    const chunk = binary.slice(i, i + 8);
    if (chunk.length === 8) {
      bytes.push(parseInt(chunk, 2));
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a random secret key for TOTP
 */
export function generateSecret(): string {
  const randomBytes = crypto.randomBytes(20); // 160 bits
  return base32Encode(randomBytes);
}

/**
 * Generate TOTP code from secret
 */
export function generateTOTP(secret: string, timeStep: number = 30): string {
  try {
    const key = base32Decode(secret);
    
    // Calculate time step (current time / timeStep)
    const time = Math.floor(Date.now() / 1000 / timeStep);
    
    // Convert time to 8-byte buffer (big-endian)
    const timeBuffer = Buffer.allocUnsafe(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(time, 4);
    
    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    
    // Convert to 6-digit code
    const totp = (code % 1000000).toString().padStart(6, '0');
    
    return totp;
  } catch (error) {
    console.error('TOTP generation error:', error);
    throw new Error('Failed to generate TOTP code');
  }
}

/**
 * Verify TOTP code
 * Allows time window (default ±1 time step = 30 seconds before/after)
 */
export function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1
): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / 30);
  
  // Check current time step and adjacent steps (to handle clock skew)
  for (let i = -window; i <= window; i++) {
    const time = currentTime + i;
    const timeBuffer = Buffer.allocUnsafe(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(time, 4);
    
    try {
      const key = base32Decode(secret);
      const hmac = crypto.createHmac('sha1', key);
      hmac.update(timeBuffer);
      const hash = hmac.digest();
      
      const offset = hash[hash.length - 1] & 0x0f;
      const calculatedCode =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);
      
      const totp = (calculatedCode % 1000000).toString().padStart(6, '0');
      
      if (totp === code) {
        return true;
      }
    } catch (error) {
      // Continue to next time step if decoding fails
      continue;
    }
  }
  
  return false;
}

/**
 * Generate QR code URL for authenticator apps
 */
export function generateQRCodeURL(
  secret: string,
  email: string,
  issuer: string = 'ثناوي'
): string {
  // URL format: otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  const otpAuthURL = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  
  // Use a QR code service (or generate locally)
  // Option 1: Use external service like qrcode.tec-it.com
  // return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpAuthURL)}`;
  
  // Option 2: Use local QR code generation (requires qrcode library)
  // For now, return the otpauth URL - frontend can generate QR code
  return otpAuthURL;
}

/**
 * Setup TOTP for a user
 */
export async function setupTOTP(userId: string): Promise<{
  secret: string;
  qrCodeURL: string;
  manualEntryKey: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const secret = generateSecret();

  // Generate QR code URL
  const qrCodeURL = generateQRCodeURL(secret, user.email);

  // Format secret for manual entry (with spaces every 4 chars)
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;

  // Store secret temporarily (not enabled yet - user needs to verify first)
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      // Don't enable yet - user must verify with authenticator first
    },
  });

  return {
    secret,
    qrCodeURL,
    manualEntryKey,
  };
}

/**
 * Verify and enable TOTP for a user
 */
export async function verifyAndEnableTOTP(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorSecret) {
    throw new Error('TOTP not set up for this user');
  }

  // Verify the code
  const isValid = verifyTOTP(user.twoFactorSecret, code);

  if (!isValid) {
    return false;
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
    },
  });

  return true;
}

/**
 * Verify TOTP code during login
 */
export async function verifyTOTPLogin(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return false;
  }

  return verifyTOTP(user.twoFactorSecret, code);
}

/**
 * Disable TOTP for a user
 */
export async function disableTOTP(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return false;
  }

  // Verify code before disabling
  const isValid = verifyTOTP(user.twoFactorSecret, code);

  if (!isValid) {
    return false;
  }

  // Disable and clear secret
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return true;
}


import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import bcrypt from 'bcryptjs';

import { logger } from '@/lib/logger';

// Get device information from user agent
export async function getDeviceInfo(userAgent: string) {
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      type: result.device.type || 'desktop',
      browser: result.browser.name || 'unknown',
      os: result.os.name || 'unknown',
      deviceVendor: result.device.vendor || 'unknown',
      deviceModel: result.device.model || 'unknown',
      cpu: result.cpu.architecture || 'unknown',
      userAgent
    };
  } catch (error) {
    logger.error('Error parsing user agent:', error);
    return {
      type: 'unknown',
      browser: 'unknown',
      os: 'unknown',
      deviceVendor: 'unknown',
      deviceModel: 'unknown',
      cpu: 'unknown',
      userAgent
    };
  }
}

// Get location from IP address (simplified implementation)
// In a real implementation, you would use a service like IPGeolocation or MaxMind
export async function getLocationFromIP(ip: string) {
  try {
    // Skip for localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'Local Network';
    }

    // This is a placeholder implementation
    // In production, you would use a proper IP geolocation service
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();

    if (data.error) {
      logger.error('IP geolocation error:', data.error);
      return 'Unknown';
    }

    return `${data.city}, ${data.region}, ${data.country_name}`;
  } catch (error) {
    logger.error('Error getting location from IP:', error);
    return 'Unknown';
  }
}

/**
 * Generate a cryptographically secure random token
 * Uses crypto.randomBytes for security-critical token generation
 */
export function generateSecureToken(length = 32): string {
  // Use URL-safe base64 encoding (no + / = characters)
  const bytesNeeded = Math.ceil((length * 3) / 4);
  return crypto.randomBytes(bytesNeeded).toString('base64url').substring(0, length);
}

/**
 * Generate a cryptographically secure numeric code (e.g., for OTP)
 * Security: Uses crypto.randomInt for uniform distribution
 */
export function generateSecureNumericCode(length = 6): string {
  let code = '';
  const max = 10; // digits 0-9

  for (let i = 0; i < length; i++) {
    // Use crypto.randomInt for uniform distribution
    code += crypto.randomInt(max).toString();
  }

  return code;
}

/**
 * Generate a device fingerprint using SHA-256
 * Note: For production, consider using a proper fingerprinting library like fingerprintjs
 */
export function generateDeviceFingerprint(userAgent: string, ip: string, screenInfo?: string): string {
  const data = `${userAgent}-${ip}-${screenInfo || ''}-${new Date().getTimezoneOffset()}`;

  // Use SHA-256 for consistent and secure hashing
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Common weak passwords to check against
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '123456789', '12345',
  'qwerty', 'abc123', 'password1', 'admin', 'welcome',
  'letmein', 'monkey', 'dragon', 'master', 'iloveyou',
  'trustno1', 'sunshine', 'princess', 'football', 'shadow'
]);

/**
 * Check if a password is strong
 * Enhanced with more comprehensive security requirements
 */
export function isPasswordStrong(password: string): { isStrong: boolean; feedback: string[]; score: number } {
  const feedback: string[] = [];
  let score = 0;

  // Length check (minimum 8, bonus for longer)
  if (password.length < 8) {
    feedback.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
  } else {
    score += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    feedback.push('يجب أن تحتوي على رقم واحد على الأقل');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('يجب أن تحتوي على رمز خاص واحد على الأقل');
  } else {
    score += 1;
  }

  // Check for common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    feedback.push('كلمة المرور شائعة جداً');
    score = Math.max(0, score - 3);
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('تجنب تكرار نفس الحرف أكثر من مرتين');
    score = Math.max(0, score - 1);
  }

  // Check for sequential numbers
  if (/012|123|234|345|456|567|678|789|890/.test(password)) {
    feedback.push('تجنب استخدام أرقام متسلسلة');
    score = Math.max(0, score - 1);
  }

  return {
    isStrong: feedback.length === 0 && score >= 5,
    feedback,
    score: Math.min(10, score)
  };
}

/**
 * Generate cryptographically secure backup codes for 2FA
 * Uses crypto.randomBytes for security
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < count; i++) {
    // Generate 8 random bytes and convert to alphanumeric
    const randomBytes = crypto.randomBytes(8);
    let code = '';

    for (let j = 0; j < 8; j++) {
      if (j === 4) code += '-';
      // Use modulo to map byte to character set
      code += charSet.charAt(randomBytes[j] % charSet.length);
    }
    codes.push(code);
  }

  return codes;
}

// Hash a security question answer
export async function hashSecurityAnswer(answer: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(answer.toLowerCase().trim(), saltRounds);
}

// Verify a security question answer
export async function verifySecurityAnswer(answer: string, hash: string): Promise<boolean> {
  return bcrypt.compare(answer.toLowerCase().trim(), hash);
}

// Detect suspicious login activity
export function isLoginSuspicious(
  currentIP: string,
  previousIPs: string[],
  currentDevice: string,
  previousDevices: string[],
  currentLocation: string,
  previousLocations: string[]
): { isSuspicious: boolean; reasons: string[] } {
  const reasons = [];

  // Check if IP is from a different country
  if (previousLocations.length > 0 && !previousLocations.includes(currentLocation)) {
    reasons.push('Login from a new location');
  }

  // Check if IP is new
  if (previousIPs.length > 0 && !previousIPs.includes(currentIP)) {
    reasons.push('Login from a new IP address');
  }

  // Check if device is new
  if (previousDevices.length > 0 && !previousDevices.includes(currentDevice)) {
    reasons.push('Login from a new device');
  }

  // Check for Tor exit nodes (simplified)
  if (isTorExitNode(currentIP)) {
    reasons.push('Login from Tor network');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons
  };
}

// Simplified Tor exit node detection
function isTorExitNode(ip: string): boolean {
  // This is a placeholder implementation
  // In a real implementation, you would use a service like Tor Project's exit node list
  // or a commercial threat intelligence service
  return false;
}

// Sanitize user input to prevent XSS attacks
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number format (simplified)
export function isValidPhoneNumber(phone: string): boolean {
  // This is a simplified validation
  // In a real implementation, you would use a proper phone number validation library
  const phoneRegex = /^[\d\s\-+()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

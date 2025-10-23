
import { UAParser } from 'ua-parser-js';

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
    console.error('Error parsing user agent:', error);
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
      console.error('IP geolocation error:', data.error);
      return 'Unknown';
    }

    return `${data.city}, ${data.region}, ${data.country_name}`;
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return 'Unknown';
  }
}

// Generate a secure random token
export function generateSecureToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    token += chars.charAt(randomIndex);
  }

  return token;
}

// Generate a device fingerprint
export function generateDeviceFingerprint(userAgent: string, ip: string, screenInfo?: string) {
  // This is a simplified implementation
  // In a real implementation, you would collect more browser attributes
  // and use a proper fingerprinting library like fingerprintjs

  const data = `${userAgent}-${ip}-${screenInfo || ''}-${new Date().getTimezoneOffset()}`;

  // Simple hash function (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16);
}

// Check if a password is strong
export function isPasswordStrong(password: string): { isStrong: boolean; feedback: string[] } {
  const feedback = [];

  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Password should contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Password should contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('Password should contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('Password should contain at least one special character');
  }

  // Check for common passwords
  const commonPasswords = [
    'password', '123456', '12345678', '123456789', '12345',
    'qwerty', 'abc123', 'password1', 'admin', 'welcome'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    feedback.push('Password is too common');
  }

  return {
    isStrong: feedback.length === 0,
    feedback
  };
}

// Generate backup codes for 2FA
export function generateBackupCodes(count = 10): string[] {
  const codes = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    let code = '';
    for (let j = 0; j < 8; j++) {
      if (j === 4) code += '-';
      const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      code += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    codes.push(code);
  }

  return codes;
}

// Hash a security question answer
export async function hashSecurityAnswer(answer: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  const saltRounds = 10;
  return bcrypt.hash(answer.toLowerCase().trim(), saltRounds);
}

// Verify a security question answer
export async function verifySecurityAnswer(answer: string, hash: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
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
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

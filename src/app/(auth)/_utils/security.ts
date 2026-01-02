/**
 * Advanced security utilities for authentication
 * Provides CSRF protection, rate limiting helpers, and security validations
 */

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store CSRF token in session storage
 */
export function storeCSRFToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem('csrf_token', token);
  } catch (error) {
    console.error('Failed to store CSRF token:', error);
  }
}

/**
 * Get CSRF token from session storage
 */
export function getCSRFToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return sessionStorage.getItem('csrf_token');
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = getCSRFToken();
  return storedToken !== null && storedToken === token;
}

/**
 * Rate limiting helper - in-memory store
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Check if action is allowed
   */
  isAllowed(
    identifier: string,
    maxAttempts: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetAt) {
      // Reset or create new record
      this.attempts.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: now + windowMs,
      };
    }

    if (record.count >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: maxAttempts - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset attempts for identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Clear all attempts
   */
  clear(): void {
    this.attempts.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Check rate limit for an action
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000 // 1 minute default
): { allowed: boolean; remaining: number; resetAt: number } {
  return rateLimiter.isAllowed(identifier, maxAttempts, windowMs);
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimiter.reset(identifier);
}

/**
 * Validate input against XSS patterns
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email against injection patterns
 */
export function validateEmailSecurity(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  const dangerousPatterns = [
    /<script/gi,
    /javascript:/gi,
    /on\w+=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(email));
}

/**
 * Generate secure random string
 */
export function generateSecureRandomString(length: number = 32): string {
  if (typeof window === 'undefined' || !crypto || !crypto.getRandomValues) {
    // Fallback for server-side or older browsers
    return Math.random().toString(36).substring(2, length + 2);
  }

  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash string (simple hash for client-side, not for passwords)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if request is from same origin
 */
export function isSameOrigin(url: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const urlObj = new URL(url, window.location.href);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Validate request headers for security
 */
export function validateRequestHeaders(headers: HeadersInit): boolean {
  if (typeof window === 'undefined') {
    return true; // Server-side, assume valid
  }

  // Check for required security headers
  const headersObj = headers as Record<string, string>;
  
  // Content-Type should be set for POST requests
  if (headersObj['Content-Type'] && !headersObj['Content-Type'].includes('application/json')) {
    return false;
  }

  return true;
}


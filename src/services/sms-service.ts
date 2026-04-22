/**
* SMS Service - Abstract SMS provider for verification codes
* Supports Twilio, MessageBird, and custom providers
*/

import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface SMSProvider {
  sendSMS(phone: string, message: string): Promise<SMSResult>;
  getProviderName(): string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  deliveryStatus?: SMSDeliveryStatus;
}

export type SMSDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'unknown';

export interface SMSRateLimitInfo {
  phone: string;
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

export interface SMSConfig {
  provider: 'twilio' | 'messagebird' | 'console';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  apiKey?: string;
}

// ==================== DELIVERY TRACKING ====================

export interface SMSDeliveryWebhook {
  messageId: string;
  status: SMSDeliveryStatus;
  timestamp: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface SMSDeliveryRecord {
  messageId: string;
  phone: string;
  status: SMSDeliveryStatus;
  sentAt: number;
  deliveredAt?: number;
  failedAt?: number;
  errorCode?: string;
  attempts: number;
}

const SMS_TEMPLATES = {
  verification: {
    ar: (code: string, expiresIn: number) =>
    `رمز التحقق الخاص بك هو: ${code}\nصالح لمدة ${expiresIn} دقائق.\nلا تشاركه مع أحد.`,
    en: (code: string, expiresIn: number) =>
    `Your verification code is: ${code}\nValid for ${expiresIn} minutes.\nDo not share with anyone.`
  },
  security_alert: {
    ar: (action: string) =>
    `تنبيه أمني: تم ${action} على حسابك. إذا لم تكن أنت، اتصل بنا فوراً.`,
    en: (action: string) =>
    `Security alert: ${action} on your account. If this wasn't you, contact us immediately.`
  }
} as const;


// ==================== PROVIDERS ====================

/**
 * Console provider for development/testing
 */
class ConsoleSMSProvider implements SMSProvider {
  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    logger.info(`[SMS Console] To: ${phone}\nMessage: ${message}`);
    return {
      success: true,
      messageId: `console-${Date.now()}`,
      provider: 'console'
    };
  }

  getProviderName(): string {
    return 'console';
  }
}

/**
 * Twilio SMS Provider
 */
class TwilioSMSProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: SMSConfig) {
    this.accountSid = config.accountSid || '';
    this.authToken = config.authToken || '';
    this.fromNumber = config.fromNumber || '';
  }

  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return {
        success: false,
        error: 'Twilio credentials not configured',
        provider: 'twilio'
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: phone,
          From: this.fromNumber,
          Body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Twilio SMS send failed:', errorData);
        return {
          success: false,
          error: errorData?.message || 'Failed to send SMS',
          provider: 'twilio'
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.sid,
        provider: 'twilio'
      };
    } catch (error) {
      logger.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'twilio'
      };
    }
  }

  getProviderName(): string {
    return 'twilio';
  }
}

/**
 * MessageBird SMS Provider
 */
class MessageBirdSMSProvider implements SMSProvider {
  private apiKey: string;
  private fromNumber: string;

  constructor(config: SMSConfig) {
    this.apiKey = config.apiKey || '';
    this.fromNumber = config.fromNumber || 'Thanawy';
  }

  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'MessageBird API key not configured',
        provider: 'messagebird'
      };
    }

    try {
      const url = 'https://rest.messagebird.com/messages';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originator: this.fromNumber,
          recipients: [phone],
          body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('MessageBird SMS send failed:', errorData);
        return {
          success: false,
          error: errorData?.errors?.[0]?.description || 'Failed to send SMS',
          provider: 'messagebird'
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id,
        provider: 'messagebird'
      };
    } catch (error) {
      logger.error('MessageBird SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'messagebird'
      };
    }
  }

  getProviderName(): string {
    return 'messagebird';
  }
}

// ==================== SMS SERVICE ====================

/**
 * Main SMS Service - Handles all SMS operations
 */
export class SMSService {
  private static instance: SMSService;
  private provider: SMSProvider;
  // In-memory rate limit cache (use Redis in production for distributed systems)
  private rateLimitCache: Map<string, SMSRateLimitInfo> = new Map();
  // Delivery status cache for tracking SMS delivery
  private deliveryCache: Map<string, SMSDeliveryRecord> = new Map();
  private readonly MAX_ATTEMPTS = 5; // Max SMS per phone per window
  private readonly RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  private readonly LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes lockout
  private readonly DELIVERY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  private constructor() {
    // Initialize provider based on environment
    const config = this.getConfig();
    this.provider = this.createProvider(config);

    // Clean up old rate limit entries periodically
    setInterval(() => this.cleanupRateLimitCache(), 5 * 60 * 1000);
    // Clean up old delivery records
    setInterval(() => this.cleanupDeliveryCache(), 10 * 60 * 1000);
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  private getConfig(): SMSConfig {
    const provider = process.env.SMS_PROVIDER as SMSConfig['provider'] || 'console';

    return {
      provider,
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.SMS_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER,
      apiKey: process.env.MESSAGEBIRD_API_KEY
    };
  }

  private createProvider(config: SMSConfig): SMSProvider {
    switch (config.provider) {
      case 'twilio':
        return new TwilioSMSProvider(config);
      case 'messagebird':
        return new MessageBirdSMSProvider(config);
      default:
        if (process.env.NODE_ENV === 'production') {
          logger.warn('SMS provider not configured, using console fallback');
        }
        return new ConsoleSMSProvider();
    }
  }

  /**
   * Check if phone is rate limited
   */
  private checkRateLimit(phone: string): {allowed: boolean;retryAfterMs?: number;} {
    const now = Date.now();
    const info = this.rateLimitCache.get(phone);

    if (!info) {
      return { allowed: true };
    }

    // Check if still in lockout
    if (info.blockedUntil && info.blockedUntil > now) {
      return {
        allowed: false,
        retryAfterMs: info.blockedUntil - now
      };
    }

    // Check if window has expired
    if (now - info.lastAttempt > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimitCache.delete(phone);
      return { allowed: true };
    }

    // Check attempt count
    if (info.attempts >= this.MAX_ATTEMPTS) {
      // Apply lockout
      info.blockedUntil = now + this.LOCKOUT_DURATION_MS;
      this.rateLimitCache.set(phone, info);
      return {
        allowed: false,
        retryAfterMs: this.LOCKOUT_DURATION_MS
      };
    }

    return { allowed: true };
  }

  /**
   * Record an SMS attempt for rate limiting
   */
  private recordAttempt(phone: string): void {
    const now = Date.now();
    const info = this.rateLimitCache.get(phone);

    if (!info || now - info.lastAttempt > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimitCache.set(phone, {
        phone,
        attempts: 1,
        lastAttempt: now
      });
    } else {
      info.attempts++;
      info.lastAttempt = now;
      this.rateLimitCache.set(phone, info);
    }
  }

  /**
   * Cleanup expired rate limit entries
   */
  private cleanupRateLimitCache(): void {
    const now = Date.now();
    for (const [phone, info] of this.rateLimitCache.entries()) {
      if (now - info.lastAttempt > this.RATE_LIMIT_WINDOW_MS * 2) {
        this.rateLimitCache.delete(phone);
      }
    }
  }

  /**
   * Cleanup expired delivery records
   */
  private cleanupDeliveryCache(): void {
    const now = Date.now();
    for (const [messageId, record] of this.deliveryCache.entries()) {
      if (now - record.sentAt > this.DELIVERY_CACHE_TTL_MS) {
        this.deliveryCache.delete(messageId);
      }
    }
  }

  /**
   * Track SMS delivery for a message
   */
  private trackDelivery(messageId: string, phone: string): void {
    this.deliveryCache.set(messageId, {
      messageId,
      phone,
      status: 'pending',
      sentAt: Date.now(),
      attempts: 1
    });
  }

  /**
   * Get delivery status for a message
   * @param messageId The message ID to check
   */
  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryRecord | null> {
    // Check cache first
    const cached = this.deliveryCache.get(messageId);
    if (cached && cached.status !== 'pending') {
      return cached;
    }

    // For production, query the provider API
    if (this.provider.getProviderName() === 'twilio') {
      try {
        const status = await this.queryTwilioStatus(messageId);
        if (status && cached) {
          cached.status = status;
          if (status === 'delivered') {
            cached.deliveredAt = Date.now();
          } else if (status === 'failed') {
            cached.failedAt = Date.now();
          }
          this.deliveryCache.set(messageId, cached);
        }
        return cached || null;
      } catch (error) {
        logger.warn('Failed to query Twilio status:', error);
      }
    }

    return cached || null;
  }

  /**
   * Query Twilio for message status
   */
  private async queryTwilioStatus(messageId: string): Promise<SMSDeliveryStatus | null> {
    const config = this.getConfig();
    if (!config.accountSid || !config.authToken) {
      return null;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages/${messageId}.json`;
      const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!response.ok) return null;

      const data = await response.json();
      const statusMap: Record<string, SMSDeliveryStatus> = {
        'delivered': 'delivered',
        'sent': 'pending',
        'queued': 'pending',
        'failed': 'failed',
        'undelivered': 'failed'
      };

      return statusMap[data.status] || 'unknown';
    } catch {
      return null;
    }
  }

  /**
   * Handle webhook callback from SMS provider
   * @param webhook The webhook payload
   */
  handleWebhook(webhook: SMSDeliveryWebhook): void {
    const record = this.deliveryCache.get(webhook.messageId);
    if (!record) {
      logger.warn(`Received webhook for unknown message: ${webhook.messageId}`);
      return;
    }

    record.status = webhook.status;
    if (webhook.status === 'delivered') {
      record.deliveredAt = webhook.timestamp;
    } else if (webhook.status === 'failed') {
      record.failedAt = webhook.timestamp;
      record.errorCode = webhook.errorCode;
    }

    this.deliveryCache.set(webhook.messageId, record);
    logger.info(`SMS delivery update: ${webhook.messageId} -> ${webhook.status}`);
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(
  phone: string,
  code: string,
  expiresInMinutes: number = 10,
  locale: 'ar' | 'en' = 'ar')
  : Promise<SMSResult> {
    const message = SMS_TEMPLATES.verification[locale](code, expiresInMinutes);
    return this.sendSMS(phone, message);
  }

  // sendLoginCode removed


  /**
   * Send security alert SMS
   */
  async sendSecurityAlert(
  phone: string,
  action: string,
  locale: 'ar' | 'en' = 'ar')
  : Promise<SMSResult> {
    const message = SMS_TEMPLATES.security_alert[locale](action);
    return this.sendSMS(phone, message);
  }

  /**
   * Send raw SMS message with rate limiting
   */
  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    // Validate phone number format
    const cleanPhone = this.normalizePhone(phone);
    if (!cleanPhone) {
      return {
        success: false,
        error: 'Invalid phone number format',
        provider: this.provider.getProviderName(),
        deliveryStatus: 'failed'
      };
    }

    // Check rate limit
    const rateLimitCheck = this.checkRateLimit(cleanPhone);
    if (!rateLimitCheck.allowed) {
      const retryAfterMinutes = Math.ceil((rateLimitCheck.retryAfterMs || 0) / 60000);
      logger.warn(`SMS rate limit exceeded for phone: ${cleanPhone.substring(0, 6)}***`);
      return {
        success: false,
        error: `SMS rate limit exceeded. Please try again in ${retryAfterMinutes} minutes.`,
        provider: this.provider.getProviderName(),
        deliveryStatus: 'failed'
      };
    }

    // Record the attempt
    this.recordAttempt(cleanPhone);

    // Send SMS
    const result = await this.provider.sendSMS(cleanPhone, message);

    // Add delivery status and track
    result.deliveryStatus = result.success ? 'pending' : 'failed';

    // Track delivery for successful sends
    if (result.success && result.messageId) {
      this.trackDelivery(result.messageId, cleanPhone);
    }

    return result;
  }

  /**
   * Send verification with email fallback
   * If SMS fails, returns info for email fallback
   */
  async sendVerificationWithFallback(
  phone: string,
  email: string | undefined,
  code: string,
  expiresInMinutes: number = 10,
  locale: 'ar' | 'en' = 'ar')
  : Promise<SMSResult & {shouldFallbackToEmail?: boolean;}> {
    const result = await this.sendVerificationCode(phone, code, expiresInMinutes, locale);

    if (!result.success && email) {
      logger.info(`SMS failed for ${phone.substring(0, 6)}***, suggesting email fallback to ${email}`);
      return {
        ...result,
        shouldFallbackToEmail: true
      };
    }

    return result;
  }

  /**
   * Normalize phone number to E.164 format
   * Supports international formats with focus on MENA region
   */
  private normalizePhone(phone: string): string | null {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Country code mappings for MENA region
    const _countryPatterns: Array<{prefix: string;localLength: number;countryCode: string;}> = [
    { prefix: '0', localLength: 11, countryCode: '+2' }, // Egypt (0xxxxxxxxxx -> +2xxxxxxxxxx)
    { prefix: '05', localLength: 10, countryCode: '+966' }, // Saudi Arabia
    { prefix: '07', localLength: 10, countryCode: '+962' }, // Jordan
    { prefix: '09', localLength: 10, countryCode: '+971' } // UAE
    ];

    // Handle Egyptian numbers
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '+2' + cleaned;
    }
    // If no country code, assume Egypt for 10-digit numbers
    else if (!cleaned.startsWith('+') && cleaned.length === 10) {
      cleaned = '+20' + cleaned;
    }
    // Saudi Arabia (9665xxxxxxxx)
    else if (cleaned.startsWith('9665') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    }
    // Add + if missing for international format
    else if (!cleaned.startsWith('+') && cleaned.length > 10) {
      cleaned = '+' + cleaned;
    }

    // Validate E.164 format: + followed by 10-15 digits
    if (!/^\+\d{10,15}$/.test(cleaned)) {
      return null;
    }

    // Additional validation for known country codes
    const validCountryCodes = [
    '+20', // Egypt
    '+966', // Saudi Arabia
    '+971', // UAE
    '+962', // Jordan
    '+961', // Lebanon
    '+212', // Morocco
    '+216', // Tunisia
    '+213', // Algeria
    '+965', // Kuwait
    '+968', // Oman
    '+974', // Qatar
    '+973', // Bahrain
    '+1', // USA/Canada
    '+44' // UK
    ];

    const hasValidCountryCode = validCountryCodes.some((code) => cleaned.startsWith(code));
    if (!hasValidCountryCode && !cleaned.startsWith('+9') && !cleaned.startsWith('+2')) {
      logger.warn(`Phone number has unusual country code: ${cleaned.substring(0, 4)}***`);
    }

    return cleaned;
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }

  /**
   * Get rate limit status for a phone number
   */
  getRateLimitStatus(phone: string): {remaining: number;resetInMs: number;} | null {
    const cleanPhone = this.normalizePhone(phone);
    if (!cleanPhone) return null;

    const info = this.rateLimitCache.get(cleanPhone);
    if (!info) {
      return { remaining: this.MAX_ATTEMPTS, resetInMs: 0 };
    }

    const now = Date.now();
    if (now - info.lastAttempt > this.RATE_LIMIT_WINDOW_MS) {
      return { remaining: this.MAX_ATTEMPTS, resetInMs: 0 };
    }

    return {
      remaining: Math.max(0, this.MAX_ATTEMPTS - info.attempts),
      resetInMs: this.RATE_LIMIT_WINDOW_MS - (now - info.lastAttempt)
    };
  }
}

// Export singleton instance
export const smsService = SMSService.getInstance();
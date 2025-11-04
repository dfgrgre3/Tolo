/**
 * CAPTCHA Service
 * Handles CAPTCHA verification and tracking failed login attempts
 */

interface CaptchaConfig {
  enabled: boolean;
  threshold: number; // Number of failed attempts before requiring CAPTCHA
  provider: 'hcaptcha' | 'recaptcha' | 'custom';
  siteKey?: string;
  secretKey?: string;
}

const DEFAULT_CONFIG: CaptchaConfig = {
  enabled: true,
  threshold: 3,
  provider: 'hcaptcha',
  siteKey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
  secretKey: process.env.HCAPTCHA_SECRET_KEY,
};

class CaptchaService {
  private config: CaptchaConfig;

  constructor(config?: Partial<CaptchaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if CAPTCHA should be required based on failed attempts
   */
  shouldRequireCaptcha(failedAttempts: number): boolean {
    if (!this.config.enabled) {
      return false;
    }
    return failedAttempts >= this.config.threshold;
  }

  /**
   * Verify CAPTCHA token with provider
   */
  async verifyCaptcha(token: string, remoteIp?: string): Promise<boolean> {
    if (!this.config.enabled || !token) {
      return true; // If CAPTCHA is disabled, allow
    }

    switch (this.config.provider) {
      case 'hcaptcha':
        return this.verifyHcaptcha(token, remoteIp);
      case 'recaptcha':
        return this.verifyRecaptcha(token, remoteIp);
      default:
        // Custom implementation or fallback
        return true;
    }
  }

  /**
   * Verify hCaptcha token
   */
  private async verifyHcaptcha(token: string, remoteIp?: string): Promise<boolean> {
    if (!this.config.secretKey) {
      console.warn('hCaptcha secret key not configured');
      return true; // Allow if not configured (development)
    }

    try {
      const response = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: this.config.secretKey,
          response: token,
          ...(remoteIp && { remoteip: remoteIp }),
        }),
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('hCaptcha verification error:', error);
      return false;
    }
  }

  /**
   * Verify reCAPTCHA token
   */
  private async verifyRecaptcha(token: string, remoteIp?: string): Promise<boolean> {
    if (!this.config.secretKey) {
      console.warn('reCAPTCHA secret key not configured');
      return true;
    }

    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: this.config.secretKey,
          response: token,
          ...(remoteIp && { remoteip: remoteIp }),
        }),
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return false;
    }
  }

  /**
   * Get client-side configuration for CAPTCHA widget
   */
  getClientConfig() {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      siteKey: this.config.siteKey,
      threshold: this.config.threshold,
    };
  }
}

// Export singleton instance
export const captchaService = new CaptchaService();

// Export for custom configuration
export { CaptchaService };
export type { CaptchaConfig };


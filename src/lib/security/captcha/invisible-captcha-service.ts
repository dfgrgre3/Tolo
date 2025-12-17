/**
 * 🤖 Invisible CAPTCHA Service - خدمة CAPTCHA غير المرئي
 * 
 * دعم متعدد المزودين:
 * - reCAPTCHA v3 (Google)
 * - Turnstile (Cloudflare)
 * 
 * يعمل في الخلفية دون إزعاج المستخدم
 */

export type CaptchaProvider = 'recaptcha_v3' | 'turnstile' | 'none';

export interface CaptchaVerifyResult {
    success: boolean;
    score?: number; // 0.0 to 1.0
    action?: string;
    hostname?: string;
    errorCodes?: string[];
    provider: CaptchaProvider;
}

export interface CaptchaConfig {
    provider: CaptchaProvider;
    siteKey: string;
    secretKey: string;
    /** Minimum score to pass (0.0 to 1.0) */
    minScore?: number;
    /** Whether to show challenge for low scores */
    showChallengeOnLowScore?: boolean;
}

// Score thresholds
export const SCORE_THRESHOLDS = {
    DEFINITELY_BOT: 0.1,
    LIKELY_BOT: 0.3,
    SUSPICIOUS: 0.5,
    LIKELY_HUMAN: 0.7,
    DEFINITELY_HUMAN: 0.9,
} as const;

/**
 * Get default CAPTCHA configuration from environment
 */
export function getCaptchaConfig(): CaptchaConfig {
    const provider = (process.env.CAPTCHA_PROVIDER || 'recaptcha_v3') as CaptchaProvider;

    switch (provider) {
        case 'recaptcha_v3':
            return {
                provider: 'recaptcha_v3',
                siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY || '',
                secretKey: process.env.RECAPTCHA_V3_SECRET_KEY || '',
                minScore: 0.5,
            };
        case 'turnstile':
            return {
                provider: 'turnstile',
                siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
                secretKey: process.env.TURNSTILE_SECRET_KEY || '',
                minScore: 0.5,
            };
        default:
            return {
                provider: 'none',
                siteKey: '',
                secretKey: '',
            };
    }
}

/**
 * Verify reCAPTCHA v3 token
 */
async function verifyRecaptchaV3(
    token: string,
    secretKey: string,
    expectedAction?: string
): Promise<CaptchaVerifyResult> {
    const url = 'https://www.google.com/recaptcha/api/siteverify';

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        // Verify action if expected
        if (expectedAction && data.action !== expectedAction) {
            return {
                success: false,
                score: data.score,
                action: data.action,
                hostname: data.hostname,
                errorCodes: ['action-mismatch'],
                provider: 'recaptcha_v3',
            };
        }

        return {
            success: data.success,
            score: data.score,
            action: data.action,
            hostname: data.hostname,
            errorCodes: data['error-codes'],
            provider: 'recaptcha_v3',
        };
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return {
            success: false,
            errorCodes: ['network-error'],
            provider: 'recaptcha_v3',
        };
    }
}

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(
    token: string,
    secretKey: string,
    remoteip?: string
): Promise<CaptchaVerifyResult> {
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteip) {
        formData.append('remoteip', remoteip);
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        return {
            success: data.success,
            // Turnstile doesn't provide a score, but we can infer from success
            score: data.success ? 1.0 : 0.0,
            hostname: data.hostname,
            errorCodes: data['error-codes'],
            provider: 'turnstile',
        };
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return {
            success: false,
            errorCodes: ['network-error'],
            provider: 'turnstile',
        };
    }
}

/**
 * Main CAPTCHA verification function
 */
export async function verifyCaptcha(
    token: string,
    options?: {
        expectedAction?: string;
        remoteip?: string;
        config?: Partial<CaptchaConfig>;
    }
): Promise<CaptchaVerifyResult> {
    const config = { ...getCaptchaConfig(), ...options?.config };

    if (!token) {
        return {
            success: false,
            errorCodes: ['missing-token'],
            provider: config.provider,
        };
    }

    if (config.provider === 'none') {
        // CAPTCHA disabled, allow all requests
        return {
            success: true,
            score: 1.0,
            provider: 'none',
        };
    }

    if (!config.secretKey) {
        console.warn('CAPTCHA secret key not configured');
        // Fail open in development, fail closed in production
        return {
            success: process.env.NODE_ENV !== 'production',
            errorCodes: ['missing-secret-key'],
            provider: config.provider,
        };
    }

    switch (config.provider) {
        case 'recaptcha_v3':
            return verifyRecaptchaV3(token, config.secretKey, options?.expectedAction);
        case 'turnstile':
            return verifyTurnstile(token, config.secretKey, options?.remoteip);
        default:
            return {
                success: false,
                errorCodes: ['unknown-provider'],
                provider: config.provider,
            };
    }
}

/**
 * Check if CAPTCHA result indicates a bot
 */
export function isLikelyBot(result: CaptchaVerifyResult): boolean {
    if (!result.success) return true;
    if (result.score !== undefined && result.score < SCORE_THRESHOLDS.SUSPICIOUS) {
        return true;
    }
    return false;
}

/**
 * Check if additional verification is needed
 */
export function needsAdditionalVerification(result: CaptchaVerifyResult): boolean {
    if (!result.success) return true;
    if (result.score !== undefined) {
        return result.score < SCORE_THRESHOLDS.LIKELY_HUMAN;
    }
    return false;
}

/**
 * Get recommendation based on CAPTCHA score
 */
export function getCaptchaRecommendation(
    result: CaptchaVerifyResult
): 'allow' | 'challenge' | 'block' {
    if (!result.success) {
        return 'block';
    }

    if (result.score === undefined) {
        return result.success ? 'allow' : 'block';
    }

    if (result.score >= SCORE_THRESHOLDS.LIKELY_HUMAN) {
        return 'allow';
    } else if (result.score >= SCORE_THRESHOLDS.LIKELY_BOT) {
        return 'challenge';
    } else {
        return 'block';
    }
}

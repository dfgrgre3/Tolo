/**
 * 🔐 Password Breach Checker - التحقق من تسريب كلمات المرور
 * 
 * يستخدم HaveIBeenPwned API مع تقنية k-anonymity
 * للتحقق من كلمات المرور بشكل آمن
 */

import crypto from 'crypto';

export interface BreachCheckResult {
    breached: boolean;
    count?: number;
    message?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface BreachCheckOptions {
    /** Minimum breach count to consider dangerous */
    minBreachThreshold?: number;
    /** Custom user agent */
    userAgent?: string;
    /** Timeout in milliseconds */
    timeout?: number;
}

const DEFAULT_OPTIONS: Required<BreachCheckOptions> = {
    minBreachThreshold: 1,
    userAgent: 'Thanawy-Security-Checker/1.0',
    timeout: 5000,
};

/**
 * Password Breach Checker using HaveIBeenPwned API
 * 
 * Uses k-anonymity model:
 * 1. Hash the password using SHA-1
 * 2. Send only the first 5 characters to HIBP API
 * 3. Receive all hashes starting with those 5 chars
 * 4. Check locally if our full hash is in the response
 * 
 * This ensures the actual password is never sent over the network!
 */
export class PasswordBreachChecker {
    private readonly HIBP_API = 'https://api.pwnedpasswords.com/range/';
    private readonly options: Required<BreachCheckOptions>;

    constructor(options?: BreachCheckOptions) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Check if a password has been breached
     */
    async checkPassword(password: string): Promise<BreachCheckResult> {
        try {
            // Generate SHA-1 hash (HIBP uses SHA-1)
            const hash = this.sha1Hash(password).toUpperCase();

            // Split into prefix (5 chars) and suffix (remaining)
            const prefix = hash.substring(0, 5);
            const suffix = hash.substring(5);

            // Fetch all hashes starting with this prefix
            const response = await this.fetchWithTimeout(
                `${this.HIBP_API}${prefix}`,
                {
                    headers: {
                        'User-Agent': this.options.userAgent,
                        'Add-Padding': 'true', // Adds random entries to prevent timing attacks
                    },
                },
                this.options.timeout
            );

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limited
                    return {
                        breached: false,
                        message: 'تعذر التحقق حالياً. يرجى المحاولة لاحقاً.',
                    };
                }
                throw new Error(`HIBP API error: ${response.status}`);
            }

            // Parse response and check for our hash
            const hashes = await response.text();
            const matchResult = this.findHashInResponse(suffix, hashes);

            if (matchResult.found) {
                return {
                    breached: true,
                    count: matchResult.count,
                    message: this.getBreachMessage(matchResult.count!),
                    severity: this.getSeverity(matchResult.count!),
                };
            }

            return {
                breached: false,
                message: 'كلمة المرور لم تظهر في أي عمليات اختراق معروفة.',
            };

        } catch (error) {
            console.error('Password breach check error:', error);

            // Don't block registration/login on API failure
            return {
                breached: false,
                message: 'تعذر التحقق من أمان كلمة المرور.',
            };
        }
    }

    /**
     * Check password synchronously (for client-side preview)
     * Returns a promise but can be used for async validation
     */
    async checkPasswordAsync(password: string): Promise<BreachCheckResult> {
        return this.checkPassword(password);
    }

    /**
     * Generate SHA-1 hash of password
     */
    private sha1Hash(password: string): string {
        return crypto
            .createHash('sha1')
            .update(password, 'utf8')
            .digest('hex');
    }

    /**
     * Find hash suffix in HIBP response
     */
    private findHashInResponse(
        suffix: string,
        responseText: string
    ): { found: boolean; count?: number } {
        const lines = responseText.split('\n');

        for (const line of lines) {
            // Each line format: HASH_SUFFIX:COUNT
            const [hashSuffix, countStr] = line.split(':');

            if (hashSuffix?.trim().toUpperCase() === suffix) {
                return {
                    found: true,
                    count: parseInt(countStr?.trim() || '0', 10),
                };
            }
        }

        return { found: false };
    }

    /**
     * Get user-friendly breach message based on count
     */
    private getBreachMessage(count: number): string {
        if (count >= 1000000) {
            return `⚠️ تحذير خطير! كلمة المرور هذه ظهرت في أكثر من مليون عملية اختراق!`;
        } else if (count >= 100000) {
            return `⚠️ تحذير! كلمة المرور هذه ظهرت في ${this.formatNumber(count)} عملية اختراق.`;
        } else if (count >= 10000) {
            return `⚠️ كلمة المرور هذه ظهرت في ${this.formatNumber(count)} عملية اختراق.`;
        } else if (count >= 1000) {
            return `كلمة المرور هذه ظهرت في ${this.formatNumber(count)} عملية اختراق.`;
        } else {
            return `كلمة المرور هذه ظهرت في ${count} عملية اختراق.`;
        }
    }

    /**
     * Get severity level based on breach count
     */
    private getSeverity(count: number): BreachCheckResult['severity'] {
        if (count >= 100000) return 'critical';
        if (count >= 10000) return 'high';
        if (count >= 100) return 'medium';
        return 'low';
    }

    /**
     * Format number with Arabic numerals
     */
    private formatNumber(num: number): string {
        return new Intl.NumberFormat('ar-EG').format(num);
    }

    /**
     * Fetch with timeout
     */
    private async fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeout: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

// Singleton instance for convenience
export const passwordBreachChecker = new PasswordBreachChecker();

// Convenience function
export async function checkPasswordBreach(
    password: string,
    options?: BreachCheckOptions
): Promise<BreachCheckResult> {
    const checker = options
        ? new PasswordBreachChecker(options)
        : passwordBreachChecker;
    return checker.checkPassword(password);
}

// Client-side compatible version (uses Web Crypto API)
export async function checkPasswordBreachClient(
    password: string
): Promise<BreachCheckResult> {
    try {
        // Use Web Crypto API for client-side hashing
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: {
                'Add-Padding': 'true',
            },
        });

        if (!response.ok) {
            return { breached: false };
        }

        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
            const [hashSuffix, countStr] = line.split(':');
            if (hashSuffix?.trim().toUpperCase() === suffix) {
                const count = parseInt(countStr?.trim() || '0', 10);
                return {
                    breached: true,
                    count,
                    severity: count >= 100000 ? 'critical' : count >= 10000 ? 'high' : count >= 100 ? 'medium' : 'low',
                };
            }
        }

        return { breached: false };
    } catch {
        return { breached: false };
    }
}

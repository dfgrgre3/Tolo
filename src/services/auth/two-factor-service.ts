import { OTP } from 'otplib';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';

/**
 * Service for handling Two-Factor Authentication (TOTP).
 */
export class TwoFactorService {
    private static readonly totp = new OTP({ strategy: 'totp' });

    /**
     * Generate a new 2FA secret for a user.
     */
    static generateSecret(email: string) {
        const secret = this.totp.generateSecret();
        const otpauth = this.totp.generateURI({
            issuer: 'Sajeel',
            label: email,
            secret,
        });
        return { secret, otpauth };
    }

    /**
     * Generate a QR code data URL for 2FA setup.
     */
    static async generateQRCode(otpauth: string): Promise<string> {
        return await QRCode.toDataURL(otpauth);
    }

    /**
     * Verify a 2FA token.
     */
    static verifyToken(token: string, secret: string): boolean {
        return this.totp.verifySync({ token, secret }).valid;
    }

    /**
     * Enable 2FA for a user.
     */
    static async enable2FA(userId: string, secret: string, token: string): Promise<boolean> {
        const isValid = this.verifyToken(token, secret);
        if (!isValid) return false;

        // Generate recovery codes (simple implementation)
        const recoveryCodes = Array.from({ length: 10 }, () =>
            Math.random().toString(36).substring(2, 10).toUpperCase()
        );

        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: secret,
                recoveryCodes: JSON.stringify(recoveryCodes),
            },
        });

        return true;
    }

    /**
     * Disable 2FA for a user.
     */
    static async disable2FA(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                recoveryCodes: null,
            },
        });
    }
}

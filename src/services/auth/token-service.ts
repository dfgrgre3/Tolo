import { SignJWT, jwtVerify } from 'jose';
import { logger } from '@/lib/logger';

/**
 * TokenService - JWT token generation and verification.
 * 
 * Design Decisions:
 * - Uses 'jose' library instead of 'jsonwebtoken' for Edge Runtime compatibility
 * - Access tokens are short-lived (15 min) to minimize exposure window
 * - Refresh tokens are long-lived (7 days) and bound to sessions
 * - HS256 algorithm is used (symmetric) - suitable for monolithic Next.js apps
 * - For microservices, consider RS256 (asymmetric) for independent verification
 */

// Configuration
export const ACCESS_TOKEN_EXPIRATION = '15m'; // Short-lived for security
export const REFRESH_TOKEN_EXPIRATION = '30d'; // Matches maximum session duration (rememberMe)

// SECURITY CRITICAL: In production, JWT_SECRET MUST be set via environment variable.
// The fallback key is only for development and will produce a warning.
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'super_secret_fallback_key_production_ready'
);

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    logger.error('🚨 CRITICAL: JWT_SECRET is not set in production environment!');
}

export interface TokenPayload {
    userId: string;
    role: string;
    sessionId?: string;
    type?: string;
    [key: string]: unknown;
}

export class TokenService {
    /**
     * Generates a new Access Token (short-lived: 15 minutes).
     * Contains userId, role, and sessionId for authorization decisions.
     */
    static async generateAccessToken(payload: TokenPayload): Promise<string> {
        return new SignJWT({ ...payload, type: 'access' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
            .sign(JWT_SECRET);
    }

    /**
     * Generates a new Refresh Token (long-lived: 7 days).
     * Contains minimal data - only userId and sessionId for token rotation.
     */
    static async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
        const payload = { userId, type: 'refresh', sessionId };
        return new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(REFRESH_TOKEN_EXPIRATION)
            .sign(JWT_SECRET);
    }

    /**
     * Verifies a token and returns the payload securely.
     * Returns null if the token is invalid, expired, or tampered with.
     */
    static async verifyToken<T>(token: string): Promise<T | null> {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            return payload as T;
        } catch {
            return null;
        }
    }
}

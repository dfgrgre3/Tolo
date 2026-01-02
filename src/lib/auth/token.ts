import { jwtVerify, SignJWT } from 'jose'
import { getJWTSecret } from '@/lib/env-validation'

/**
 * Token payload interface
 */
export interface TokenPayload {
    userId: string
    email?: string
    role?: string
    sessionId?: string
    type?: 'access' | 'refresh' | '2fa_temp'
    jti?: string
    [key: string]: unknown
}

/**
 * Get JWT secret securely - returns null if not configured
 */
function getSecret(): Uint8Array | null {
    try {
        const secret = getJWTSecret()
        if (!secret) {
            console.error('[Auth] JWT_SECRET not configured')
            return null
        }
        return new TextEncoder().encode(secret)
    } catch {
        console.error('[Auth] Failed to get JWT secret')
        return null
    }
}

/**
 * Verify a JWT token from a request
 * Extracts token from Authorization header or cookies
 * @param req - The Request object
 * @returns The token payload or null if invalid
 */
export async function verifyToken(req: Request): Promise<TokenPayload | null> {
    try {
        const token = await extractToken(req)
        if (!token) return null

        const secret = getSecret()
        if (!secret) return null

        const { payload } = await jwtVerify(token, secret, {
            issuer: 'thanawy-auth',
            audience: 'thanawy-app'
        })

        return payload as TokenPayload
    } catch (error) {
        // Token is invalid or expired
        return null
    }
}

/**
 * Verify a raw JWT token string
 * @param token - The JWT token string
 * @returns The token payload or null if invalid
 */
export async function verifyTokenString(token: string): Promise<TokenPayload | null> {
    try {
        if (!token || typeof token !== 'string') return null

        const secret = getSecret()
        if (!secret) return null

        const { payload } = await jwtVerify(token, secret, {
            issuer: 'thanawy-auth',
            audience: 'thanawy-app'
        })

        return payload as TokenPayload
    } catch {
        return null
    }
}

/**
 * Generate a new JWT token
 * @param payload - The payload to encode
 * @param expiresIn - Token expiration time (default: 1h)
 * @returns The signed JWT token or null if secret not configured
 */
export async function generateToken(
    payload: Partial<TokenPayload>,
    expiresIn: string = '1h'
): Promise<string | null> {
    try {
        const secret = getSecret()
        if (!secret) return null

        const token = await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .setIssuer('thanawy-auth')
            .setAudience('thanawy-app')
            .sign(secret)

        return token
    } catch {
        console.error('[Auth] Failed to generate token')
        return null
    }
}

/**
 * Extract token from request (Authorization header or cookies)
 */
async function extractToken(req: Request): Promise<string | undefined> {
    try {
        // Check Authorization header
        const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7)
        }

        // Check cookies
        const cookieHeader = req.headers.get('cookie')
        if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=')
                acc[key] = value
                return acc
            }, {} as Record<string, string>)

            if (cookies['access_token']) return cookies['access_token']
        }
        return undefined
    } catch {
        return undefined
    }
}

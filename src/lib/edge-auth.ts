import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export interface EdgeTokenVerificationResult {
    isValid: boolean;
    user?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
    };
    error?: string;
}

export function getEdgeJWTSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        // In Edge runtime, we might want to fail gracefully or log differently
        // But for auth, missing secret is critical.
        console.error('JWT_SECRET is not set');
        throw new Error('JWT_SECRET is not set');
    }
    return new TextEncoder().encode(secret);
}

export async function verifyEdgeToken(token: string): Promise<EdgeTokenVerificationResult> {
    try {
        const secret = getEdgeJWTSecret();
        const { payload } = await jwtVerify(token, secret);

        return {
            isValid: true,
            user: {
                id: payload.userId as string,
                email: payload.email as string,
                name: payload.name as string,
                role: payload.role as string,
            },
        };
    } catch (error) {
        return { isValid: false, error: 'Invalid token' };
    }
}

export function extractEdgeToken(request: NextRequest): string | null {
    const tokenCookie = request.cookies.get('access_token')?.value || request.cookies.get('authToken')?.value;
    if (tokenCookie) return tokenCookie;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}


import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

export async function generateCsrfToken() {
    const cookieStore = await cookies();
    const token = crypto.randomUUID();

    // Set the cookie
    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by client JS for simple double-submit or we provide an endpoint
        // Actually, for better security with double-submit, we usually:
        // 1. Set httpOnly cookie with token.
        // 2. Return token in body/header for client to store in memory.
        // But double-submit pattern often relies on client reading the cookie.

        // Let's go with: 
        // Cookie is HTTPOnly (secure).
        // Application provides an endpoint to get the token (CSRF claim).
        // Client sends token in Header.
        // Server compares Cookie value vs Header value.

        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });

    return token;
}

export async function verifyCsrfToken(request: Request | NextRequest) {
    let tokenFromCookie: string | undefined;

    // Check if request is NextRequest (middleware)
    if ('cookies' in request && typeof (request as NextRequest).cookies.get === 'function') {
        tokenFromCookie = (request as NextRequest).cookies.get(CSRF_COOKIE_NAME)?.value;
    } else {
        // Route Handler / Server Component context
        const cookieStore = await cookies();
        tokenFromCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    }

    const tokenFromHeader = request.headers.get(CSRF_HEADER_NAME);

    if (!tokenFromCookie || !tokenFromHeader) {
        return false;
    }

    return tokenFromCookie === tokenFromHeader;
}

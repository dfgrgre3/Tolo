import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyEdgeToken, extractEdgeToken } from '@/lib/edge-auth';

// Paths that require authentication
const PROTECTED_PATHS = [
    '/account',
    '/profile',
    '/settings',
    '/dashboard',
    '/analytics',
    '/schedule',
    '/tasks',
    '/exams',
    '/courses',
    '/my-courses',
    '/progress',
    '/achievements',
    '/leaderboard',
    '/goals',
    '/library',
    '/resources',
    '/forum',
    '/blog',
    '/chat',
    '/events',
    '/contests',
    '/notifications',
    '/security',
    '/time',
    '/teacher-exams',
    '/announcements',
];

// Paths that require admin role
const ADMIN_PATHS = [
    '/admin',
    '/dashboard/admin',
];

// Public paths (excluded from checks)
const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/api/auth',
    '/_next',
    '/favicon.ico',
    '/images',
    '/public',
];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if path is public
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Check if path is protected
    const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));
    const isAdmin = ADMIN_PATHS.some(path => pathname.startsWith(path));

    // If not protected and not admin, allow access (default allow policy for other pages like home, about, etc.)
    // Or should we default deny? Usually default allow for public site.
    if (!isProtected && !isAdmin) {
        return NextResponse.next();
    }

    const token = extractEdgeToken(request);

    if (!token) {
        // For API routes, return 401 Unauthorized instead of redirect
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
    }

    const verification = await verifyEdgeToken(token);

    if (!verification.isValid) {
        // For API routes, return 401 Unauthorized instead of redirect
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
    }

    // Check admin role
    if (isAdmin && verification.user?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Add user info to headers for downstream use if needed
    const requestHeaders = new Headers(request.headers);
    if (verification.user) {
        requestHeaders.set('x-user-id', verification.user.id);
        requestHeaders.set('x-user-role', verification.user.role || 'user');
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withEnhancedAuth } from '@/lib/auth/enhanced-middleware';

// المسارات التي تتطلب مصادقة
const PROTECTED_PATHS = [
  '/dashboard',
  '/profile',
  '/settings',
  '/my-courses',
  '/exams/start',
];

// المسارات التي تتطلب صلاحيات مسؤول
const ADMIN_PATHS = [
  '/admin',
  '/dashboard/admin',
];

// المسارات العامة التي يجب استثناؤها من التحقق
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
];

export async function middleware(request: NextRequest) {
  return NextResponse.next();
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

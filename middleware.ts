import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyEdgeToken, extractEdgeToken } from '@/lib/edge-auth';

/**
 * ============================================
 * Middleware - حماية المسارات على مستوى الخادم
 * ============================================
 * 
 * هذا الـ middleware يحمي المسارات التي تتطلب تسجيل الدخول
 * ويعمل على مستوى Edge Runtime قبل تحميل الصفحة
 */

// المسارات التي تتطلب تسجيل الدخول
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

// المسارات التي تتطلب دور المشرف
const ADMIN_PATHS = [
  '/admin',
  '/dashboard/admin',
  '/teachers',
];

// المسارات العامة (لا تحتاج إلى حماية)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  // المصادقة - المسارات العامة فقط
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/send-verification',
  '/api/auth/verify-reset-code',
  '/api/auth/google',
  '/api/auth/facebook',
  '/api/auth/apple',
  '/api/auth/magic-link',
  '/api/auth/recover-account',
  '/api/auth/phone/send-otp',
  '/api/auth/phone/verify',
  // مسارات عامة أخرى
  '/api/public',
  '/_next',
  '/favicon.ico',
  '/images',
  '/public',
  '/components-gallery',
  '/test',
  '/offline',
  '/tips',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // التحقق من المسارات العامة
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // التحقق من المسارات المحمية
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isAdmin = ADMIN_PATHS.some(path => pathname.startsWith(path));
  const isApiRoute = pathname.startsWith('/api');

  // إذا لم يكن محمياً وليس مشرف وليس API، السماح بالوصول
  if (!isProtected && !isAdmin && !isApiRoute) {
    return NextResponse.next();
  }

  // استخراج التوكن
  const token = extractEdgeToken(request);

  // إذا لم يكن هناك توكن
  if (!token) {
    // للمسارات API، إرجاع 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'غير مصرح', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    // للمسارات العادية، إعادة التوجيه إلى صفحة تسجيل الدخول
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // التحقق من صحة التوكن
  const verification = await verifyEdgeToken(token);

  if (!verification.isValid) {
    // للمسارات API، إرجاع 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'انتهت صلاحية الجلسة', code: 'INVALID_OR_EXPIRED_TOKEN' },
        { status: 401 }
      );
    }
    // للمسارات العادية، إعادة التوجيه إلى صفحة تسجيل الدخول
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // التحقق من دور المشرف
  if (isAdmin && verification.user?.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية للوصول', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // إضافة معلومات المستخدم إلى الـ headers للاستخدام اللاحق
  const requestHeaders = new Headers(request.headers);
  if (verification.user) {
    requestHeaders.set('x-user-id', verification.user.id);
    requestHeaders.set('x-user-email', verification.user.email);
    requestHeaders.set('x-user-role', verification.user.role || 'user');
    if (verification.user.name) {
      requestHeaders.set('x-user-name', verification.user.name);
    }
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
     * تطابق جميع مسارات الطلبات ما عدا:
     * - _next/static (الملفات الثابتة)
     * - _next/image (ملفات تحسين الصور)
     * - favicon.ico (أيقونة الموقع)
     * - ملفات static الأخرى
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};


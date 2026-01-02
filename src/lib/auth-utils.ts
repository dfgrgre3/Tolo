import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ==================== CONSTANTS ====================

export const RESET_TOKEN_EXPIRY_HOURS = 1;
export const RESET_TOKEN_EXPIRY_MS = RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
export const EMAIL_VERIFICATION_EXPIRY_MS = EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000;
export const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour in seconds
export const REFRESH_TOKEN_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 days in seconds
export const REFRESH_TOKEN_MAX_AGE_DEFAULT = 24 * 60 * 60; // 24 hours in seconds

// ==================== HELPER FUNCTIONS ====================

/**
 * Get secure cookie options
 * Security: Centralized cookie security settings for consistency across the application
 */
export function getSecureCookieOptions(options?: {
    maxAge?: number;
    sameSite?: 'strict' | 'lax' | 'none';
}): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge?: number;
} {
    const isProduction = process.env.NODE_ENV === 'production';

    // Security: In production, secure MUST be true (no exceptions)
    // Only allow false in development if explicitly set via COOKIE_SECURE=false
    const isSecure = isProduction
        ? true  // Always secure in production
        : (process.env.COOKIE_SECURE === 'true' || process.env.COOKIE_SECURE !== 'false');

    const defaultSameSite = isProduction
        ? 'strict'  // Maximum security in production
        : 'lax';    // More permissive in development

    const sameSite = options?.sameSite ||
        (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') ||
        defaultSameSite;

    if (isProduction && !isSecure) {
        logger.error('SECURITY WARNING: Cookies are not secure in production! This is a critical security issue.');
    }

    return {
        httpOnly: true,
        secure: isSecure,
        sameSite: sameSite,
        path: '/',
        ...(options?.maxAge !== undefined && { maxAge: options.maxAge }),
    };
}

/**
 * Helper function to set authentication cookies
 */
export function setAuthCookies(
    response: NextResponse,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean = false
): void {
    response.cookies.set('access_token', accessToken, {
        ...getSecureCookieOptions({ maxAge: ACCESS_TOKEN_MAX_AGE }),
    });

    response.cookies.set('refresh_token', refreshToken, {
        ...getSecureCookieOptions({
            maxAge: rememberMe ? REFRESH_TOKEN_MAX_AGE_REMEMBER : REFRESH_TOKEN_MAX_AGE_DEFAULT
        }),
    });
}

/**
 * Helper function to clear authentication cookies
 */
export function clearAuthCookies(response: NextResponse): void {
    response.cookies.set('access_token', '', {
        ...getSecureCookieOptions({ maxAge: 0 }),
    });

    response.cookies.set('refresh_token', '', {
        ...getSecureCookieOptions({ maxAge: 0 }),
    });
}

/**
 * Helper function to check if error is a connection/database error
 */
export function isConnectionError(error: unknown): boolean {
    if (!error) return false;

    // Check for Prisma error codes
    if (typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string | number };
        const errorCode = String(prismaError.code).toUpperCase();
        if (errorCode.startsWith('P1')) return true;
        if (errorCode === 'P2002') return true;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullError = errorMessage.toLowerCase();

    const connectionKeywords = [
        'connect', 'connection', 'econnrefused', 'etimedout', 'econnreset',
        'enotfound', 'networkerror', 'network error', 'failed to fetch',
        'fetch error', 'connection timeout', 'connection refused',
        'connection lost', 'connection closed', 'socket hang up', 'econnaborted',
    ];

    const databaseKeywords = [
        'database', 'prisma', 'query timeout', 'connection pool',
        'pool exhausted', 'too many connections',
    ];

    if (connectionKeywords.some(keyword => fullError.includes(keyword))) {
        return true;
    }

    if (databaseKeywords.some(keyword => fullError.includes(keyword))) {
        const prismaDataErrorPattern = /p20[0-9][0-9]/;
        if (!prismaDataErrorPattern.test(fullError) || fullError.includes('p2002')) {
            return true;
        }
    }

    return false;
}

/**
 * Helper function to get error code from error
 */
export function getErrorCode(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullError = errorMessage.toLowerCase();

    if (isConnectionError(error)) {
        return 'CONNECTION_ERROR';
    } else if (fullError.includes('unauthorized') || fullError.includes('invalid')) {
        return 'AUTH_ERROR';
    } else if (fullError.includes('rate limit') || fullError.includes('too many')) {
        return 'RATE_LIMIT_ERROR';
    } else if (fullError.includes('validation')) {
        return 'VALIDATION_ERROR';
    }

    return 'SERVER_ERROR';
}

/**
 * Helper function to create error response
 */
export function createErrorResponse(
    error: unknown,
    defaultMessage: string = 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.',
    statusOverride?: number
): NextResponse {
    let errorMessage: string;
    let errorCode: string;

    if (!error) {
        errorMessage = defaultMessage;
        errorCode = 'SERVER_ERROR';
    } else if (error instanceof Error) {
        errorMessage = error.message || defaultMessage;
        errorCode = getErrorCode(error);
    } else if (typeof error === 'string') {
        errorMessage = error || defaultMessage;
        errorCode = 'SERVER_ERROR';
    } else if (typeof error === 'object') {
        const errorObj = error as { error?: string; code?: string; message?: string;[key: string]: unknown };
        const keys = Object.keys(errorObj);

        if (keys.length === 0) {
            errorMessage = defaultMessage;
            errorCode = 'SERVER_ERROR';
        } else if (errorObj.error) {
            errorMessage = errorObj.error;
            errorCode = errorObj.code || getErrorCode(error);
        } else {
            errorMessage = errorObj.message || errorObj.toString() || defaultMessage;
            errorCode = errorObj.code || getErrorCode(error);
        }
    } else {
        errorMessage = String(error) || defaultMessage;
        errorCode = 'SERVER_ERROR';
    }

    const isConnection = isConnectionError(error);
    const userFriendlyMessage = isConnection
        ? 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.'
        : errorMessage;

    const status = statusOverride || (isConnection ? 503 : 500);

    const response = NextResponse.json(
        {
            error: userFriendlyMessage,
            code: errorCode,
            details: (typeof error === 'object' && error !== null && 'details' in error) ? (error as any).details : (process.env.NODE_ENV === 'development' ? errorMessage : undefined),
        },
        { status }
    );

    return addSecurityHeaders(response);
}

/**
 * Standard error response creator with security headers
 */
export function createStandardErrorResponse(
    error: unknown,
    defaultMessage: string = 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.',
    status: number = 500
): NextResponse {
    return createErrorResponse(error, defaultMessage, status);
}

/**
 * Add security headers to a NextResponse
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    if (process.env.NODE_ENV === 'production') {
        response.headers.set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        );
    }

    return response;
}

/**
 * Format lockout time for display
 */
export function formatLockoutTime(seconds: number): string {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Check if request is from a trusted source
 */
export function isTrustedRequest(request: Request): boolean {
    if (process.env.NODE_ENV === 'production') {
        const origin = request.headers.get('origin');
        const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || '';

        if (origin && allowedOrigin) {
            try {
                const originUrl = new URL(origin);
                const allowedUrl = new URL(allowedOrigin);
                return originUrl.hostname === allowedUrl.hostname;
            } catch {
                return origin.includes(allowedOrigin);
            }
        }
        return !origin || origin.includes(allowedOrigin);
    }
    return true;
}

/**
 * Extract IP and User Agent from request
 */
export function extractRequestMetadata(request: NextRequest): {
    ip: string;
    userAgent: string;
    clientId: string;
} {
    if (!request || typeof request !== 'object') {
        return {
            ip: 'unknown',
            userAgent: 'unknown',
            clientId: 'unknown-unknown',
        };
    }

    // Extract IP
    let ip = 'unknown';
    if ((request as any).ip) {
        ip = (request as any).ip;
    } else {
        const forwardedFor = request.headers.get('x-forwarded-for');
        if (forwardedFor) ip = forwardedFor.split(',')[0];
        else {
            const realIp = request.headers.get('x-real-ip');
            if (realIp) ip = realIp;
        }
    }

    // Extract User Agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const sanitizedIP = typeof ip === 'string' ? ip.trim().slice(0, 100) : 'unknown';
    const sanitizedUserAgent = typeof userAgent === 'string' ? userAgent.trim().slice(0, 500) : 'unknown';

    return {
        ip: sanitizedIP,
        userAgent: sanitizedUserAgent,
        clientId: `${sanitizedIP}-${sanitizedUserAgent}`.slice(0, 600),
    };
}

/**
 * Validate and parse request body with size limits
 */
export async function parseRequestBody<T = unknown>(
    request: NextRequest,
    options: {
        maxSize?: number; // in bytes, default 1024 (1KB)
        required?: boolean;
    } = {}
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
    if (!request || typeof request !== 'object') {
        return {
            success: false,
            error: NextResponse.json({ error: 'طلب غير صحيح.', code: 'INVALID_REQUEST' }, { status: 400 }),
        };
    }

    const { maxSize = 1024, required = false } = options;
    const validMaxSize = Math.max(1, Math.min(maxSize, 10 * 1024 * 1024));
    const contentLength = request.headers.get('content-length');

    if (required && (contentLength === '0' || !contentLength)) {
        if (contentLength === '0') {
            return {
                success: false,
                error: NextResponse.json({ error: 'الطلب فارغ.', code: 'EMPTY_REQUEST_BODY' }, { status: 400 }),
            };
        }
    }

    if (contentLength) {
        const length = parseInt(contentLength, 10);
        if (!isNaN(length) && length > validMaxSize) {
            return {
                success: false,
                error: NextResponse.json({ error: 'حجم الطلب كبير جداً.', code: 'REQUEST_TOO_LARGE' }, { status: 413 }),
            };
        }
    }

    try {
        const textPromise = request.text();
        const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('Request body reading timeout')), 5000);
        });

        const text = await Promise.race([textPromise, timeoutPromise]);

        if (!text || text.trim().length === 0) {
            if (required) {
                return {
                    success: false,
                    error: NextResponse.json({ error: 'الطلب فارغ.', code: 'EMPTY_REQUEST_BODY' }, { status: 400 }),
                };
            }
            return { success: true, data: {} as T };
        }

        if (text.length > validMaxSize) {
            return {
                success: false,
                error: NextResponse.json({ error: 'حجم الطلب كبير جداً.', code: 'REQUEST_TOO_LARGE' }, { status: 413 }),
            };
        }

        return { success: true, data: JSON.parse(text) };
    } catch (error) {
        logger.error('Error reading request body:', error);
        return {
            success: false,
            error: NextResponse.json({ error: 'بيانات الطلب غير صحيحة.', code: 'INVALID_BODY' }, { status: 400 }),
        };
    }
}

/**
 * Database query wrapper with error handling and timeout protection
 */
export async function withDatabaseQuery<T>(
    query: () => Promise<T>,
    options: {
        onConnectionError?: () => NextResponse;
        onError?: (error: unknown) => NextResponse;
        timeout?: number; // Timeout in milliseconds, default 10 seconds
    } = {}
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
    if (!query || typeof query !== 'function') {
        const response = createErrorResponse(new Error('Invalid query function'), 'دالة الاستعلام غير صحيحة.');
        return { success: false, response };
    }

    const timeout = Math.max(1000, Math.min(options.timeout || 10000, 60000));

    try {
        const queryPromise = query();
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Database query timeout after ${timeout}ms`));
            }, timeout);
        });

        const data = await Promise.race([queryPromise, timeoutPromise]);
        return { success: true, data };
    } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
            logger.error('Database query timeout:', error);
            const response = NextResponse.json(
                { error: 'انتهت مهلة الاستعلام. يرجى المحاولة مرة أخرى.', code: 'QUERY_TIMEOUT' },
                { status: 504 }
            );
            return { success: false, response: addSecurityHeaders(response) };
        }

        if (isConnectionError(error)) {
            const response = options.onConnectionError?.() || NextResponse.json(
                { error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم.', code: 'CONNECTION_ERROR' },
                { status: 503 }
            );
            return { success: false, response: addSecurityHeaders(response) };
        }

        if (options.onError) {
            const response = options.onError(error);
            return { success: false, response: addSecurityHeaders(response) };
        }

        const response = createErrorResponse(error, 'حدث خطأ أثناء معالجة البيانات.');
        return { success: false, response };
    }
}

/**
 * Helper function to create success response
 */
export function createSuccessResponse<T>(
    data: T,
    status: number = 200
): NextResponse {
    const response = NextResponse.json(data, { status });
    return addSecurityHeaders(response);
}

/**
 * Helper to log security events safely without blocking
 */
export async function logSecurityEventSafely(
    userId: string | null,
    eventType: string,
    metadata: any = {}
): Promise<void> {
    try {
        // Dynamic import to avoid circular dependencies if any
        // But here we use just console or the logger which is safe
        logger.info(`Security Event: ${eventType}`, { userId, ...metadata });
        // In real app, call usage of security service usually
    } catch (error) {
        // Fail silently for logging
        console.error('Failed to log security event', error);
    }
}

/**
 * Retry operation with exponential backoff
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        backoffFactor?: number;
        shouldRetry?: (error: unknown) => boolean;
        onError?: (error: unknown, attempt: number) => void;
    } = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        delayMs = 1000,
        backoffFactor = 2,
        shouldRetry,
        onError
    } = options;

    let lastError: unknown;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (onError) onError(error, attempt);

            const isLastAttempt = attempt === maxAttempts;
            if (isLastAttempt) break;

            if (shouldRetry && !shouldRetry(error)) break;

            // Wait with backoff
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            currentDelay *= backoffFactor;
        }
    }

    throw lastError;
}


// ==================== OAUTH ERROR HANDLING ====================

/**
 * OAuth error messages in Arabic
 */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    'access_denied': 'تم إلغاء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
    'invalid_request': 'طلب غير صحيح. يرجى التحقق من إعدادات Redirect URI.',
    'unauthorized_client': 'تطبيق غير مصرح به. يرجى التحقق من client_id.',
    'unsupported_response_type': 'نوع استجابة غير مدعوم.',
    'invalid_scope': 'نطاق غير صحيح.',
    'server_error': 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقًا.',
    'temporarily_unavailable': 'الخدمة غير متاحة مؤقتًا. يرجى المحاولة لاحقًا.',
    'interaction_required': 'مطلوب تدخل المستخدم. يرجى المحاولة مرة أخرى.',
    'login_required': 'يرجى تسجيل الدخول إلى حسابك.',
    'account_selection_required': 'يرجى اختيار حساب للمتابعة.',
    'consent_required': 'يرجى الموافقة على الأذونات المطلوبة.',
    'invalid_grant': 'رمز التفويض منتهي الصلاحية. يرجى المحاولة مرة أخرى.',
    'invalid_client': 'بيانات اعتماد التطبيق غير صحيحة.',
    'redirect_uri_mismatch': 'عدم تطابق عنوان إعادة التوجيه.',
    'invalid_state': 'فشل التحقق من الأمان. يرجى المحاولة مرة أخرى.',
    'no_code': 'لم يتم استلام رمز التفويض.',
    'token_error': 'فشل الحصول على رمز الوصول.',
    'user_info_error': 'فشل الحصول على معلومات المستخدم.',
    'database_error': 'حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى.',
    'network_error': 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
    'timeout_error': 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.',
    'oauth_error': 'خطأ في إعدادات تسجيل الدخول.',
};

/**
 * Create OAuth error redirect URL
 */
export function createOAuthErrorRedirect(
    errorCode: string,
    customMessage?: string,
    baseUrl?: string
): string {
    const url = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const message = customMessage || OAUTH_ERROR_MESSAGES[errorCode] || 'حدث خطأ أثناء تسجيل الدخول';
    return `${url}/login?error=${encodeURIComponent(errorCode)}&message=${encodeURIComponent(message)}`;
}

/**
 * Create OAuth error response with redirect
 */
export function createOAuthErrorResponse(
    errorCode: string,
    customMessage?: string,
    baseUrl?: string
): NextResponse {
    return NextResponse.redirect(createOAuthErrorRedirect(errorCode, customMessage, baseUrl));
}

// ==================== DATABASE RETRY UTILITIES ====================

/**
 * Check if error is retryable (connection issues, timeouts, etc.)
 */
export function isRetryableError(error: unknown): boolean {
    if (isConnectionError(error)) return true;

    const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const errorCode = error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string }).code)
        : '';

    // Prisma connection errors
    if (errorCode === 'P1001' || errorCode === 'P1017') return true;

    // Race condition on unique constraint (can retry)
    if (errorCode === 'P2002') return true;

    // Timeout and connection errors
    if (errorMsg.includes('timeout') ||
        errorMsg.includes('econnrefused') ||
        errorMsg.includes('etimedout') ||
        errorMsg.includes('connection lost') ||
        errorMsg.includes('connection closed')) {
        return true;
    }

    return false;
}

/**
 * Execute database operation with retry and connection management
 */
export async function withDatabaseRetry<T>(
    operation: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        operationName?: string;
        onRetry?: (attempt: number, error: unknown) => void;
    } = {}
): Promise<T> {
    const {
        maxAttempts = 5,
        delayMs = 1000,
        operationName = 'database operation',
        onRetry
    } = options;

    return withRetry(operation, {
        maxAttempts,
        delayMs,
        backoffFactor: 2,
        shouldRetry: isRetryableError,
        onError: (error, attempt) => {
            if (onRetry) onRetry(attempt, error);
            logger.warn(`${operationName} failed (attempt ${attempt}/${maxAttempts})`, {
                error: error instanceof Error ? error.message : String(error),
                code: error && typeof error === 'object' && 'code' in error
                    ? (error as { code: string }).code
                    : undefined,
            });
        }
    });
}

/**
 * Get user-friendly database error message in Arabic
 */
export function getDatabaseErrorMessage(error: unknown): string {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorCode = error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string }).code)
        : '';

    if (isConnectionError(error)) {
        return 'فشل الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
    }

    if (errorCode === 'P1001') {
        return 'لا يمكن الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.';
    }

    if (errorCode === 'P1017') {
        return 'تم إغلاق الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
    }

    if (errorMsg.toLowerCase().includes('timeout')) {
        return 'انتهت مهلة الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
    }

    return 'حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى.';
}


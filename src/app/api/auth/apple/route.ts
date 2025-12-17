import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState, validateRedirectUri } from '@/lib/oauth';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        try {
            // Check if Apple OAuth is configured
            if (!oauthConfig.apple.isConfigured()) {
                logger.warn('Apple OAuth not configured');
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=apple_not_configured&message=${encodeURIComponent('إعدادات Apple OAuth غير مكتملة. يرجى التحقق من إعدادات الخادم.')}`
                );
            }

            // Validate redirect URI format
            if (!oauthConfig.apple.redirectUri || oauthConfig.apple.redirectUri.trim() === '') {
                logger.error('Apple OAuth: Redirect URI is not configured');
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent('عنوان إعادة التوجيه غير مُعد بشكل صحيح.')}`
                );
            }

            const redirectUriValidation = validateRedirectUri(oauthConfig.apple.redirectUri);
            if (!redirectUriValidation.valid) {
                logger.error('Apple OAuth: Invalid redirect URI format', {
                    redirectUri: oauthConfig.apple.redirectUri,
                    error: redirectUriValidation.error,
                });

                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_redirect_uri&message=${encodeURIComponent(`عنوان إعادة التوجيه غير صحيح: ${redirectUriValidation.error}`)}`
                );
            }

            // Generate a random state for CSRF protection
            const state = generateState();

            // Get redirect parameter from query string
            const { searchParams } = new URL(req.url);
            const redirectParam = searchParams.get('redirect');
            const redirectPath = redirectParam || '/';

            // Apple OAuth URL construction
            // Apple requires specific scope and response_mode parameters
            const authUrl = new URL('https://appleid.apple.com/auth/authorize');
            authUrl.searchParams.set('client_id', oauthConfig.apple.clientId);
            authUrl.searchParams.set('redirect_uri', oauthConfig.apple.redirectUri);
            authUrl.searchParams.set('response_type', 'code id_token');
            authUrl.searchParams.set('response_mode', 'form_post');
            authUrl.searchParams.set('scope', 'name email');
            authUrl.searchParams.set('state', state);

            // Store state in a cookie for later verification
            const response = NextResponse.redirect(authUrl.toString());

            // Security: Use centralized secure cookie settings
            response.cookies.set('oauth_state', state, {
                ...getSecureCookieOptions({ maxAge: 600 }), // 10 minutes
            });

            // Store redirect path in cookie
            if (redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
                response.cookies.set('oauth_redirect', redirectPath, {
                    ...getSecureCookieOptions({ maxAge: 600 }),
                });
            }

            return response;
        } catch (error) {
            logger.error('Error initiating Apple OAuth:', error);
            const errorMessage = error instanceof Error
                ? `حدث خطأ أثناء بدء عملية تسجيل الدخول بـ Apple: ${error.message}`
                : 'حدث خطأ أثناء بدء عملية تسجيل الدخول بـ Apple. يرجى المحاولة مرة أخرى.';

            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`
            );
        }
    });
}


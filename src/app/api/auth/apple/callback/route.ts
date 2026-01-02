import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
    getSecureCookieOptions,
    createOAuthErrorResponse,
    createOAuthErrorRedirect,
    OAUTH_ERROR_MESSAGES,
    withDatabaseRetry,
    getDatabaseErrorMessage
} from '@/lib/auth-utils';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import crypto from 'crypto';

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * POST /api/auth/apple/callback
 * Apple uses form_post for OAuth callback
 */
export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        try {
            // Apple sends data as form-urlencoded in POST body
            const formData = await req.formData();
            const code = formData.get('code') as string | null;
            const state = formData.get('state') as string | null;
            const idToken = formData.get('id_token') as string | null;
            const error = formData.get('error') as string | null;

            // Apple sends user info only on first login
            const userDataStr = formData.get('user') as string | null;
            let appleUser: { name?: { firstName?: string; lastName?: string }; email?: string } | null = null;
            if (userDataStr) {
                try {
                    appleUser = JSON.parse(userDataStr);
                } catch {
                    logger.warn('Failed to parse Apple user data');
                }
            }

            // Handle errors from Apple - use centralized error messages
            if (error) {
                logger.error('Apple OAuth error:', error);
                return createOAuthErrorResponse(
                    error,
                    OAUTH_ERROR_MESSAGES[error] || 'حدث خطأ أثناء تسجيل الدخول بـ Apple'
                );
            }

            // Verify state parameter to prevent CSRF attacks
            const savedState = req.cookies.get('oauth_state')?.value;
            if (!state || !savedState || !verifyState(state, savedState)) {
                logger.error('Apple OAuth: Invalid state parameter', { state, savedState });
                return createOAuthErrorResponse('invalid_state');
            }

            if (!code || !idToken) {
                logger.error('Apple OAuth: Missing code or id_token');
                return createOAuthErrorResponse('no_code', 'لم يتم استلام رمز التفويض من Apple');
            }

            // Verify the token signature using Apple's public keys
            let payload;
            try {
                const verified = await jwtVerify(idToken, APPLE_JWKS, {
                    issuer: 'https://appleid.apple.com',
                    audience: process.env.APPLE_CLIENT_ID
                });
                payload = verified.payload;

                // Additional validation: check token expiry and subject
                if (!payload.sub) {
                    throw new Error('Missing subject in token');
                }
            } catch (err) {
                logger.error('Apple JWT verification failed', err);
                return createOAuthErrorResponse('invalid_token', 'فشل التحقق من رمز المصادقة');
            }

            const appleUserId = payload.sub;
            const email = (payload.email as string) || appleUser?.email;

            if (!email) {
                logger.error('No email in Apple OAuth response');
                return createOAuthErrorResponse(
                    'no_email',
                    'لم يتم استلام البريد الإلكتروني من Apple. يرجى السماح بمشاركة البريد.'
                );
            }

            const normalizedEmail = email.toLowerCase().trim();

            // Check if user exists with retry
            let user;
            try {
                user = await withDatabaseRetry(
                    async () => prisma.user.findUnique({ where: { email: normalizedEmail } }),
                    { maxAttempts: 3, operationName: 'find user for Apple OAuth' }
                );
            } catch (dbError) {
                logger.error('Database error finding user:', dbError);
                return createOAuthErrorResponse('database_error', getDatabaseErrorMessage(dbError));
            }

            // If user doesn't exist, create a new one
            if (!user) {
                const name = appleUser?.name
                    ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
                    : 'Apple User';

                try {
                    user = await withDatabaseRetry(
                        async () => prisma.user.create({
                            data: {
                                email: normalizedEmail,
                                name,
                                passwordHash: crypto.randomUUID(), // Secure random "password" for OAuth users
                                emailVerified: true, // Apple verified the email
                            },
                        }),
                        { maxAttempts: 3, operationName: 'create user for Apple OAuth' }
                    );
                    logger.info('Created new user via Apple OAuth:', { userId: user.id, email: normalizedEmail });
                } catch (createError) {
                    logger.error('Error creating user:', createError);
                    return createOAuthErrorResponse('database_error', getDatabaseErrorMessage(createError));
                }
            }

            // Generate JWT token
            const token = await generateToken(user.id, user.email, user.name || undefined);

            // Create response with redirect
            const response = NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`
            );

            // Security: Use centralized secure cookie settings
            response.cookies.set('access_token', token, {
                ...getSecureCookieOptions({ maxAge: 7 * 24 * 60 * 60 }), // 7 days
            });

            // Clear state cookie
            response.cookies.set('oauth_state', '', {
                ...getSecureCookieOptions({ maxAge: 0 }),
            });

            return response;
        } catch (error) {
            logger.error('Error in Apple OAuth callback:', error);
            return createOAuthErrorResponse('server_error', 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.');
        }
    });
}

/**
 * GET /api/auth/apple/callback
 * Apple may send GET requests in some scenarios
 */
export async function GET(request: NextRequest) {
    return createOAuthErrorResponse('invalid_request', 'Apple OAuth يتطلب استخدام POST');
}

import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '@/app/api/auth/_helpers';
import { SignJWT } from 'jose';

// Apple uses form_post, so we need to handle POST requests
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

            // Handle errors from Apple
            if (error) {
                logger.error('Apple OAuth error:', error);
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=${error}`
                );
            }

            // Verify state parameter to prevent CSRF attacks
            const savedState = req.cookies.get('oauth_state')?.value;
            if (!state || !savedState || !verifyState(state, savedState)) {
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_state`
                );
            }

            if (!code || !idToken) {
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=no_code`
                );
            }

            // Decode the ID token to get user info
            // Note: In production, you should verify the token signature
            const tokenParts = idToken.split('.');
            if (tokenParts.length !== 3) {
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_token`
                );
            }

            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));
            const appleUserId = payload.sub;
            const email = payload.email || appleUser?.email;

            if (!email) {
                logger.error('No email in Apple OAuth response');
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=no_email`
                );
            }

            // Check if user exists in our database
            let user = await prisma.user.findUnique({
                where: { email },
            });

            // If user doesn't exist, create a new one
            if (!user) {
                const name = appleUser?.name
                    ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
                    : undefined;

                user = await prisma.user.create({
                    data: {
                        email,
                        name: name || 'Apple User',
                        passwordHash: 'oauth_apple_user', // OAuth users don't have a password
                        emailVerified: true, // Apple verified the email
                    },
                });

                logger.info('Created new user via Apple OAuth:', { userId: user.id, email });
            }

            // Generate JWT token
            const token = await generateToken(user.id, user.email, user.name || undefined);

            // Create response with redirect
            const response = NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`
            );

            // Security: Use centralized secure cookie settings
            // Set token in cookie - use access_token for consistency with login route
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
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=server_error`
            );
        }
    });
}

// Apple can also send GET requests in some scenarios
export async function GET(request: NextRequest) {
    return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_method`
    );
}

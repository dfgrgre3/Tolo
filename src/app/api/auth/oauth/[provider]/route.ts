import { NextRequest, NextResponse } from 'next/server';
import { OAuthService } from '@/lib/auth/oauth-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const { provider } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/oauth/callback/${provider}`;

    let url = '';

    if (provider === 'google') {
        url = OAuthService.getGoogleAuthUrl(redirectUri);
    } else if (provider === 'github') {
        url = OAuthService.getGithubAuthUrl(redirectUri);
    } else {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    return NextResponse.redirect(url);
}

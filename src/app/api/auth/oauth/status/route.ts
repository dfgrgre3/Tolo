import { NextResponse } from 'next/server';
import { oauthConfig } from '@/lib/oauth';

/**
 * API endpoint to check OAuth provider status
 * Used by client components to determine if OAuth buttons should be shown
 */
export async function GET() {
  try {
    const providers = {
      google: {
        enabled: oauthConfig.google.isConfigured(),
      },
      facebook: {
        enabled: oauthConfig.facebook.isConfigured(),
      },
    };

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    return NextResponse.json(
      {
        success: false,
        providers: {
          google: { enabled: false },
          facebook: { enabled: false },
        },
      },
      { status: 500 }
    );
  }
}


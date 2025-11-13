import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig } from '@/lib/oauth';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * API endpoint to check OAuth provider status
 * Used by client components to determine if OAuth buttons should be shown
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
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
    logger.error('Error checking OAuth status:', error);
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
  });
}


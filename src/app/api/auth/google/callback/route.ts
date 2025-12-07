
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken, validateRedirectUri } from '@/lib/oauth';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { isConnectionError, getSecureCookieOptions } from '@/app/api/auth/_helpers';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Google
    if (error) {
      logger.error('Google OAuth error:', error);
      logger.error('Request URL:', request.url);
      logger.error('OAuth Config:', {
        clientId: oauthConfig.google.clientId?.substring(0, 20) + '...',
        redirectUri: oauthConfig.google.redirectUri,
        isConfigured: oauthConfig.google.isConfigured(),
      });
      
      let errorMessage = 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ط¬ظˆط¬ظ„';
      
      // Map Google error codes to user-friendly Arabic messages
      const errorMessages: Record<string, string> = {
        'access_denied': 'طھظ… ط¥ظ„ط؛ط§ط، طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.',
        'invalid_request': 'ط·ظ„ط¨ ط؛ظٹط± طµط­ظٹط­. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط¥ط¹ط¯ط§ط¯ط§طھ Redirect URI ظپظٹ Google Console.',
        'unauthorized_client': 'طھط·ط¨ظٹظ‚ ط؛ظٹط± ظ…طµط±ط­ ط¨ظ‡. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† client_id ظپظٹ Google Console.',
        'unsupported_response_type': 'ظ†ظˆط¹ ط§ط³طھط¬ط§ط¨ط© ط؛ظٹط± ظ…ط¯ط¹ظˆظ…. ظٹط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط¯ط¹ظ… ط§ظ„ظپظ†ظٹ.',
        'invalid_scope': 'ظ†ط·ط§ظ‚ ط؛ظٹط± طµط­ظٹط­. ظٹط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط¯ط¹ظ… ط§ظ„ظپظ†ظٹ.',
        'server_error': 'ط®ط·ط£ ظپظٹ ط®ط§ط¯ظ… Google. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
        'temporarily_unavailable': 'ط§ظ„ط®ط¯ظ…ط© ط؛ظٹط± ظ…طھط§ط­ط© ظ…ط¤ظ‚طھط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
      };
      
      // Special handling for invalid_request which often means redirect_uri mismatch
      if (error === 'invalid_request') {
        const redirectUri = oauthConfig.google.redirectUri;
        const redirectUriValidation = validateRedirectUri(redirectUri);
        
        errorMessage = `ط·ظ„ط¨ ط؛ظٹط± طµط­ظٹط­. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ†:
1. Redirect URI ظپظٹ Google Cloud Console ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط¨ط§ظ„ط¶ط¨ط·: ${redirectUri}
   ${redirectUriValidation.valid ? 'âœ…' : 'âڑ ï¸ڈ'} ${redirectUriValidation.error || 'طµظٹط؛ط© طµط­ظٹط­ط©'}
2. OAuth Consent Screen ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ظ…ظƒطھظ…ظ„ط§ظ‹
3. ط¥ط°ط§ ظƒط§ظ† ط§ظ„طھط·ط¨ظٹظ‚ ظپظٹ ظˆط¶ط¹ ط§ظ„ط§ط®طھط¨ط§ط±طŒ طھط£ظƒط¯ ظ…ظ† ط¥ط¶ط§ظپط© ط¨ط±ظٹط¯ظƒ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظپظٹ "Test users"
4. طھط£ظƒط¯ ظ…ظ† طھط·ط§ط¨ظ‚ ط§ظ„ط¨ط±ظˆطھظˆظƒظˆظ„ (http/https) ظˆط§ظ„ظ†ط·ط§ظ‚ ظˆط§ظ„ظ…ظ†ظپط° ظˆط§ظ„ظ…ط³ط§ط± ط¨ط§ظ„ط¶ط¨ط·`;
        
        logger.error('Google OAuth redirect_uri mismatch detected', {
          expectedRedirectUri: redirectUri,
          validation: redirectUriValidation,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        });
      }
      
      errorMessage = errorMessages[error] || errorMessage;
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=${error}&message=${encodeURIComponent(errorMessage)}`
      );
    }

      // Verify state parameter to prevent CSRF attacks
      const savedState = req.cookies.get('oauth_state')?.value;
    if (!state || !savedState || !verifyState(state, savedState)) {
      logger.error('Google OAuth: Invalid state parameter', { state, savedState });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_state&message=${encodeURIComponent('ظپط´ظ„ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط£ظ…ط§ظ†. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.')}`
      );
    }

    if (!code) {
      logger.error('Google OAuth: No authorization code received');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=no_code&message=${encodeURIComponent('ظ„ظ… ظٹطھظ… ط§ط³طھظ„ط§ظ… ط±ظ…ط² ط§ظ„طھظپظˆظٹط¶ ظ…ظ† Google. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.')}`
      );
    }

    // Validate OAuth configuration before making token request
    if (!oauthConfig.google.isConfigured()) {
      logger.error('Google OAuth: Missing credentials in callback');
      const missingFields: string[] = [];
      if (!oauthConfig.google.clientId || oauthConfig.google.clientId.trim() === '') {
        missingFields.push('GOOGLE_CLIENT_ID');
      }
      if (!oauthConfig.google.clientSecret || oauthConfig.google.clientSecret.trim() === '') {
        missingFields.push('GOOGLE_CLIENT_SECRET');
      }
      
      const errorMessage = missingFields.length > 0
        ? `ط¥ط¹ط¯ط§ط¯ط§طھ Google OAuth ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©. ط§ظ„ظ…طھط؛ظٹط±ط§طھ ط§ظ„ظ…ظپظ‚ظˆط¯ط©: ${missingFields.join(', ')}. ظٹط±ط¬ظ‰ ط¥ط¶ط§ظپط© ظ‡ط°ظ‡ ط§ظ„ظ…طھط؛ظٹط±ط§طھ ط¥ظ„ظ‰ ظ…ظ„ظپ .env.local`
        : 'ط¥ط¹ط¯ط§ط¯ط§طھ Google OAuth ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط®ط§ط¯ظ….';
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // Exchange authorization code for access token
    // redirect_uri must match EXACTLY what was sent in the initial auth request
    // This is the complete redirect URI stored in oauthConfig (e.g., http://localhost:3000/api/auth/google/callback)
    // Google OAuth requires exact match - any difference will cause failure
    const redirectUriForTokenExchange = oauthConfig.google.redirectUri;
    
    // Validate redirect URI before token exchange (helps catch configuration issues early)
    const redirectUriValidation = validateRedirectUri(redirectUriForTokenExchange);
    if (!redirectUriValidation.valid) {
      logger.error('Google OAuth callback: Invalid redirect URI format', {
        redirectUri: redirectUriForTokenExchange,
        error: redirectUriValidation.error,
        note: 'This redirect_uri will be sent to Google. It must match exactly what is configured in Google Cloud Console.',
      });
    } else {
      // Log the redirect_uri being used for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        logger.info('Google OAuth callback: Using redirect_uri for token exchange', {
          redirectUri: redirectUriForTokenExchange,
          note: 'This must match exactly the redirect_uri sent in the initial auth request and configured in Google Cloud Console',
        });
      }
    }
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: oauthConfig.google.clientId,
        client_secret: oauthConfig.google.clientSecret,
        code,
        redirect_uri: redirectUriForTokenExchange, // Complete redirect URI from oauthConfig (must match exactly)
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Google OAuth token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        redirectUri: redirectUriForTokenExchange,
        note: 'If error is "redirect_uri_mismatch", ensure the redirect_uri in Google Cloud Console matches exactly: ' + redirectUriForTokenExchange,
      });
      
      let errorMessage = 'ظپط´ظ„ ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط±ظ…ط² ط§ظ„ظˆطµظˆظ„ ظ…ظ† Google.';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error === 'invalid_grant') {
          errorMessage = 'ط±ظ…ط² ط§ظ„طھظپظˆظٹط¶ ط؛ظٹط± طµط­ظٹط­ ط£ظˆ ظ…ظ†طھظ‡ظٹ ط§ظ„طµظ„ط§ط­ظٹط©. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
        } else if (errorData.error === 'invalid_client') {
          errorMessage = 'ظ…ط¹ط±ظپ ط§ظ„ط¹ظ…ظٹظ„ ط؛ظٹط± طµط­ظٹط­. ظٹط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط¯ط¹ظ… ط§ظ„ظپظ†ظٹ.';
        } else if (errorData.error === 'redirect_uri_mismatch') {
          // Special handling for redirect_uri mismatch - most common OAuth configuration error
          errorMessage = `ط¹ط¯ظ… طھط·ط§ط¨ظ‚ redirect_uri. ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط§ظ„ط¹ظ†ظˆط§ظ† ظپظٹ Google Cloud Console ط¨ط§ظ„ط¶ط¨ط·:
${redirectUriForTokenExchange}

ًں“‌ ط®ط·ظˆط§طھ ط§ظ„ط¥طµظ„ط§ط­:
1. ط§ظپطھط­ Google Cloud Console: https://console.cloud.google.com/
2. ط§ظ†طھظ‚ظ„ ط¥ظ„ظ‰: APIs & Services â†’ Credentials
3. ط§ط®طھط± OAuth 2.0 Client ID ط§ظ„ط®ط§طµ ط¨ظƒ
4. طھط£ظƒط¯ ظ…ظ† ظˆط¬ظˆط¯ ظ‡ط°ط§ ط§ظ„ط¹ظ†ظˆط§ظ† ط¨ط§ظ„ط¶ط¨ط· ظپظٹ "Authorized redirect URIs":
   ${redirectUriForTokenExchange}
5. طھط£ظƒط¯ ظ…ظ† ط§ظ„طھط·ط§ط¨ظ‚ ط§ظ„طھط§ظ…: ظ†ظپط³ ط§ظ„ط¨ط±ظˆطھظˆظƒظˆظ„ (http/https)طŒ ظ†ظپط³ ط§ظ„ظ†ط·ط§ظ‚طŒ ظ†ظپط³ ط§ظ„ظ…ظ†ظپط°طŒ ظ†ظپط³ ط§ظ„ظ…ط³ط§ط±`;
          logger.error('Google OAuth redirect_uri mismatch detected', {
            expectedRedirectUri: redirectUriForTokenExchange,
            errorFromGoogle: errorData.error_description || errorData.error,
          });
        } else if (errorData.error_description) {
          errorMessage = errorData.error_description;
        }
      } catch (e) {
        // If JSON parsing fails, use default message
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error&message=${encodeURIComponent(errorMessage)}`
      );
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      logger.error('Google OAuth token error:', tokenData);
      let errorMessage = 'ظپط´ظ„ ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط±ظ…ط² ط§ظ„ظˆطµظˆظ„ ظ…ظ† Google.';
      if (tokenData.error_description) {
        errorMessage = tokenData.error_description;
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error&message=${encodeURIComponent(errorMessage)}`
      );
    }

    if (!tokenData.access_token) {
      logger.error('Google OAuth: No access token in response');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error&message=${encodeURIComponent('ظ„ظ… ظٹطھظ… ط§ط³طھظ„ط§ظ… ط±ظ…ط² ط§ظ„ظˆطµظˆظ„ ظ…ظ† Google. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.')}`
      );
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      logger.error('Google OAuth: Failed to fetch user info', {
        status: userResponse.status,
        statusText: userResponse.statusText,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=user_info_error&message=${encodeURIComponent('ظپط´ظ„ ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ…ظ† Google. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.')}`
      );
    }

    const userData = await userResponse.json();

    if (!userData.email) {
      logger.error('Google OAuth: No email in user data');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=user_info_error&message=${encodeURIComponent('ظ„ظ… ظٹطھظ… ط§ط³طھظ„ط§ظ… ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ظ† Google. ظٹط±ط¬ظ‰ ط§ظ„طھط£ظƒط¯ ظ…ظ† ظ…ظ†ط­ ط§ظ„طھط·ط¨ظٹظ‚ طµظ„ط§ط­ظٹط© ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ.')}`
      );
    }

    // Normalize email
    const normalizedEmail = userData.email.toLowerCase().trim();
    
    // Helper function to ensure database connection with retry
    const ensureDatabaseConnection = async (maxRetries: number = 3): Promise<boolean> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Try to connect if not connected
          try {
            await prisma.$connect();
          } catch (connectError: any) {
            // If already connected, ignore the error
            if (!connectError.message?.includes('already connected')) {
              throw connectError;
            }
          }
          
          // Test the connection with a simple query
          await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 5000)
            )
          ]);
          
          return true;
        } catch (error: any) {
          logger.warn(`Database connection check failed (attempt ${attempt}/${maxRetries}):`, {
            error: error.message,
            code: error.code,
          });
          
          if (attempt < maxRetries) {
            // Try to disconnect and reconnect
            try {
              await prisma.$disconnect();
            } catch (disconnectError) {
              // Ignore disconnect errors
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          } else {
            logger.error('Failed to establish database connection after all retries');
            return false;
          }
        }
      }
      return false;
    };
    
    // Verify database connection before proceeding
    const isConnected = await ensureDatabaseConnection(3);
    if (!isConnected) {
      logger.error('Database is not connected, cannot proceed with OAuth');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent('ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§طھطµط§ظ„ ط§ظ„ط¥ظ†طھط±ظ†طھ ظˆط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.')}`
      );
    }
    
    // Helper function to retry database operations with better error handling
    const retryDatabaseOperation = async <T>(
      operation: () => Promise<T>,
      maxRetries: number = 5,
      retryDelay: number = 1000,
      operationName: string = 'database operation'
    ): Promise<T> => {
      let lastError: any;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Ensure connection before each retry
          if (attempt > 1) {
            const connected = await ensureDatabaseConnection(1);
            if (!connected) {
              throw new Error('Database connection lost');
            }
          }
          
          // Execute operation with timeout
          return await Promise.race([
            operation(),
            new Promise<T>((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), 10000)
            )
          ]);
        } catch (error: any) {
          lastError = error;
          
          // Check if error is retryable
          const isRetryable = isConnectionError(error) || 
                             error?.code === 'P1001' || // Prisma connection error
                             error?.code === 'P1017' || // Prisma server closed connection
                             error?.code === 'P2002' || // Prisma unique constraint (might be race condition)
                             error?.message?.includes('timeout') ||
                             error?.message?.includes('ECONNREFUSED') ||
                             error?.message?.includes('ETIMEDOUT') ||
                             error?.message?.includes('Connection lost') ||
                             error?.message?.includes('Connection closed');
          
          if (!isRetryable) {
            // Non-retryable error, throw immediately
            throw error;
          }
          
          if (attempt === maxRetries) {
            // Last attempt failed, throw error
            throw error;
          }
          
          logger.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}), retrying...`, {
            error: error.message,
            code: error.code,
          });
          
          // Wait before retrying (exponential backoff with jitter)
          const delay = retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));
        }
      }
      throw lastError;
    };
    
    // Check if user exists in our database with retry
    let user;
    try {
      user = await retryDatabaseOperation(async () => {
        return await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
      }, 5, 1000, 'find user by email');
    } catch (dbError: any) {
      logger.error('Database error while finding user:', {
        error: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack,
      });
      
      // Provide user-friendly error message
      let errorMessage = 'ط­ط¯ط« ط®ط·ط£ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
      
      if (isConnectionError(dbError)) {
        errorMessage = 'ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§طھطµط§ظ„ ط§ظ„ط¥ظ†طھط±ظ†طھ ظˆط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
      } else if (dbError.code === 'P1001') {
        errorMessage = 'ظ„ط§ ظٹظ…ظƒظ† ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.';
      } else if (dbError.code === 'P1017') {
        errorMessage = 'طھظ… ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
      } else if (dbError.message?.includes('timeout')) {
        errorMessage = 'ط§ظ†طھظ‡طھ ظ…ظ‡ظ„ط© ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // If user doesn't exist, create a new one with retry
    if (!user) {
      try {
        // Generate unique user ID
        const userId = uuidv4();
        
        // Normalize name (handle null/undefined)
        const normalizedName = userData.name?.trim() || null;
        
        user = await retryDatabaseOperation(async () => {
          return await prisma.user.create({
            data: {
              id: userId,
              email: normalizedEmail,
              name: normalizedName,
              passwordHash: 'oauth_user', // OAuth users don't have a password
              // Set required defaults
              emailVerified: true, // OAuth users are considered verified
              emailNotifications: true,
              smsNotifications: false,
              twoFactorEnabled: false,
              biometricEnabled: false,

              // Gamification defaults
              totalXP: 0,
              level: 1,
              currentStreak: 0,
              longestStreak: 0,
              totalStudyTime: 0,
              tasksCompleted: 0,
              examsPassed: 0,
              pomodoroSessions: 0,
              deepWorkSessions: 0,
              focusStrategy: 'POMODORO',
            },
          });
        }, 5, 1000, 'create new user');
        
        logger.info('Google OAuth: Created new user', {
          id: user.id,
          email: user.email,
          name: user.name,
        });
      } catch (createError: any) {
        logger.error('Database error while creating user:', {
          error: createError.message,
          code: createError.code,
          meta: createError.meta,
          stack: createError.stack,
        });
        
        // If user already exists (race condition or duplicate email), try to find them again
        if (createError.code === 'P2002') {
          logger.info('User already exists (race condition), finding user...');
            try {
            user = await retryDatabaseOperation(async () => {
              return await prisma.user.findUnique({
                where: { email: normalizedEmail },
              });
            }, 5, 1000, 'find user after duplicate error');
            
            if (!user) {
              logger.error('User not found after duplicate error');
              return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent('ظپط´ظ„ ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھط®ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.')}`
              );
            }
            
            logger.info('Google OAuth: Found existing user after race condition', {
              id: user.id,
              email: user.email,
            });
          } catch (findError: any) {
            logger.error('Error finding user after duplicate:', {
              error: findError.message,
              code: findError.code,
              meta: findError.meta,
            });
            
            let errorMessage = 'ظپط´ظ„ ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھط®ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
            if (isConnectionError(findError)) {
              errorMessage = 'ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
            }
            
            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent(errorMessage)}`
            );
          }
        } else {
          // Return detailed error for debugging
          let errorMessage = 'ظپط´ظ„ ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ ط¬ط¯ظٹط¯. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
          
          if (isConnectionError(createError)) {
            errorMessage = 'ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
          } else if (createError.code === 'P1001') {
            errorMessage = 'ظ„ط§ ظٹظ…ظƒظ† ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.';
          } else if (createError.code === 'P1017') {
            errorMessage = 'طھظ… ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
          } else if (createError.meta?.target) {
            errorMessage = `ظپط´ظ„ ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨: ${createError.meta.target.join(', ')}`;
          } else if (createError.message) {
            // In development, show more details
            if (process.env.NODE_ENV === 'development') {
              errorMessage = `ظپط´ظ„ ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨: ${createError.message}`;
            }
          }
          
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent(errorMessage)}`
          );
        }
      }
    }
    
    // Ensure user exists before proceeding
    if (!user) {
      logger.error('Google OAuth: User is null after all attempts');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=database_error&message=${encodeURIComponent('ظپط´ظ„ ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.')}`
      );
    }

    // Generate JWT token
    const token = await generateToken(user.id, user.email, user.name || undefined);

      // Get redirect path from cookie (set during OAuth initiation)
      const redirectPath = req.cookies.get('oauth_redirect')?.value || '/';
    
    // Validate redirect path (security measure)
    const safeRedirectPath = redirectPath.startsWith('/') && !redirectPath.startsWith('//') 
      ? redirectPath 
      : '/';

    // Create response with redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = NextResponse.redirect(
      `${baseUrl}${safeRedirectPath}`
    );

    // Security: Use centralized secure cookie settings
    // Set token in cookie - use access_token for consistency with login route
    response.cookies.set('access_token', token, {
      ...getSecureCookieOptions({ maxAge: 7 * 24 * 60 * 60 }), // 7 days
    });

    // Clear state and redirect cookies
    response.cookies.set('oauth_state', '', {
      ...getSecureCookieOptions({ maxAge: 0 }),
    });
    response.cookies.set('oauth_redirect', '', {
      ...getSecureCookieOptions({ maxAge: 0 }),
    });

    return response;
  } catch (error: unknown) {
    // Enhanced error logging
    const errorDetails = {
      error,
      errorType: typeof error,
      errorConstructor: error instanceof Error ? error.constructor.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
    };
    
    logger.error('Error in Google OAuth callback:', errorDetails);
    
    let errorMessage = 'ط­ط¯ط« ط®ط·ط£ ط؛ظٹط± ظ…طھظˆظ‚ط¹ ط£ط«ظ†ط§ط، طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ط¬ظˆط¬ظ„. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
    let errorCode = 'server_error';
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      // Network errors
      if (errorMsg.includes('fetch') || errorMsg.includes('network') || 
          errorMsg.includes('econnrefused') || errorMsg.includes('enotfound') ||
          errorMsg.includes('etimedout') || errorMsg.includes('econnreset')) {
        errorMessage = 'ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ط®ط§ط¯ظ… Google. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§طھطµط§ظ„ ط§ظ„ط¥ظ†طھط±ظ†طھ ظˆط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
        errorCode = 'network_error';
      } 
      // Database connection errors
      else if (isConnectionError(error) || 
               errorMsg.includes('database') || 
               errorMsg.includes('prisma') ||
               errorMsg.includes('p1001') ||
               errorMsg.includes('p1017') ||
               errorMsg.includes('p2002') ||
               errorMsg.includes('connection') ||
               errorMsg.includes('timeout')) {
        errorMessage = 'ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§طھطµط§ظ„ ط§ظ„ط¥ظ†طھط±ظ†طھ ظˆط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
        errorCode = 'database_error';
        
        // Try to ensure database is properly closed on error
        try {
          await prisma.$disconnect().catch(() => {
            // Ignore disconnect errors
          });
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
      } 
      // OAuth configuration errors
      else if (errorMsg.includes('oauth') || errorMsg.includes('client_id') || 
               errorMsg.includes('client_secret') || errorMsg.includes('secret')) {
        errorMessage = 'ط®ط·ط£ ظپظٹ ط¥ط¹ط¯ط§ط¯ط§طھ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„. ظٹط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط¯ط¹ظ… ط§ظ„ظپظ†ظٹ.';
        errorCode = 'oauth_error';
      }
      // JWT/Token errors (check before timeout since jwt/token are more specific)
      else if ((errorMsg.includes('jwt') || errorMsg.includes('token')) && !errorMsg.includes('timeout')) {
        errorMessage = 'ط®ط·ط£ ظپظٹ ط¥ظ†ط´ط§ط، ط±ظ…ط² ط§ظ„ظ…طµط§ط¯ظ‚ط©. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
        errorCode = 'token_error';
      }
      // Timeout errors (check after token to avoid conflicts)
      else if (errorMsg.includes('timeout')) {
        errorMessage = 'ط§ظ†طھظ‡طھ ظ…ظ‡ظ„ط© ط§ظ„ط§طھطµط§ظ„. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
        errorCode = 'timeout_error';
      }
      // Development mode - show more details
      else if (process.env.NODE_ENV === 'development') {
        errorMessage = `ط®ط·ط£ ظپظٹ ط§ظ„طھط·ظˆظٹط±: ${error.message}`;
      }
    } else if (error && typeof error === 'object') {
      // Handle object errors (Prisma errors, etc.)
      const errorObj = error as any;
      if (errorObj.code) {
        const prismaCode = String(errorObj.code);
        if (prismaCode.startsWith('P1')) {
          errorMessage = 'ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
          errorCode = 'database_error';
        } else if (prismaCode.startsWith('P2')) {
          errorMessage = 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.';
          errorCode = 'database_error';
        } else {
          errorCode = prismaCode.toLowerCase();
        }
      }
      
      if (errorObj.message) {
        errorMessage = errorObj.message;
      }
    }
    
    // Ensure safe redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/login?error=${encodeURIComponent(errorCode)}&message=${encodeURIComponent(errorMessage)}`;
    
      return NextResponse.redirect(redirectUrl);
    }
  });
}


import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { getJWTSecret } from './env-validation';
import { logger } from '@/lib/logger';

// Security: JWT_SECRET is required - no fallback values allowed
let JWT_SECRET: Uint8Array | null = null;

function getJWTSecretSafe(): Uint8Array {
  if (!JWT_SECRET) {
    const secretString = getJWTSecret();
    JWT_SECRET = new TextEncoder().encode(secretString);
  }
  return JWT_SECRET;
}

// Generate a JWT token for the user
export async function generateToken(userId: string, email: string, name?: string) {
  return new SignJWT({ userId, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJWTSecretSafe());
}

// Verify a JWT token
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJWTSecretSafe());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validates redirect URI format
 * Google OAuth requires exact match - this helps catch common mistakes
 */
export function validateRedirectUri(redirectUri: string): { valid: boolean; error?: string } {
  if (!redirectUri || redirectUri.trim() === '') {
    return { valid: false, error: 'Redirect URI cannot be empty' };
  }

  try {
    const url = new URL(redirectUri);

    // Check protocol
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        valid: false,
        error: `Invalid protocol: ${url.protocol}. Must be http:// or https://`
      };
    }

    // Check for trailing slash (common mistake)
    if (redirectUri.endsWith('/') && !redirectUri.endsWith('/callback/')) {
      return {
        valid: false,
        error: 'Redirect URI should not end with a trailing slash (except /callback/)'
      };
    }

    // Check path format
    if (!url.pathname.startsWith('/api/auth/')) {
      return {
        valid: false,
        error: 'Redirect URI path must start with /api/auth/'
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid redirect URI format: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Normalizes redirect URI to ensure exact match with Google OAuth requirements
 * Google OAuth requires EXACT match - any difference will cause failure
 * 
 * This function:
 * - Removes trailing slashes (except for /callback/)
 * - Normalizes double slashes in path
 * - Ensures consistent protocol (http/https)
 * - Validates URL structure
 * - Returns a consistent format for Google Cloud Console configuration
 */
export function normalizeRedirectUri(redirectUri: string): string {
  if (!redirectUri || redirectUri.trim() === '') {
    throw new Error('Redirect URI cannot be empty');
  }

  // Trim whitespace
  let normalized = redirectUri.trim();

  try {
    // Parse the URL to ensure it's valid
    const url = new URL(normalized);

    // Normalize protocol (ensure lowercase and consistent)
    const protocol = url.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error(`Invalid protocol: ${protocol}. Must be http:// or https://`);
    }

    // Normalize hostname (lowercase, no trailing dots)
    const hostname = url.hostname.toLowerCase().replace(/\.+$/, '');

    // Normalize pathname:
    // - Remove double slashes (except after protocol)
    // - Remove trailing slash (except for /callback/)
    let pathname = url.pathname.replace(/\/+/g, '/');

    // Remove trailing slash unless it's /callback/
    if (pathname.endsWith('/') && pathname !== '/callback/') {
      pathname = pathname.slice(0, -1);
    }

    // Reconstruct the URL with normalized components
    // This ensures exact consistency for Google OAuth
    normalized = `${protocol}//${hostname}${url.port ? `:${url.port}` : ''}${pathname}`;

    // Remove query parameters and hash (Google OAuth redirect_uri should not have them)
    // But keep them if they exist for backward compatibility warning
    if (url.search || url.hash) {
      logger.warn('⚠️ Redirect URI contains query parameters or hash. Google OAuth redirect_uri should only contain the base URL and path.');
    }

    return normalized;
  } catch (error) {
    // If URL parsing fails, try basic normalization
    if (error instanceof TypeError) {
      throw new Error(`Invalid redirect URI format: ${normalized}`);
    }
    throw error;
  }
}

/**
 * Helper function to get the exact redirect URI that should be configured in Google Cloud Console
 * This ensures developers can easily copy-paste the exact value needed
 */
export function getGoogleRedirectUriForConsole(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim();
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  return normalizeRedirectUri(`${cleanBaseUrl}/api/auth/google/callback`);
}

// OAuth configuration with validation
function getOAuthConfig() {
  // Get base URL from environment variable (should be just the domain, e.g., http://localhost:3000)
  // The redirect URI path will be appended automatically
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim();

  // Remove trailing slash if present to avoid double slashes
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

  // Build the complete redirect URI (this is what will be sent to Google OAuth)
  // This must match EXACTLY what is configured in Google Cloud Console
  // The normalizeRedirectUri function ensures consistency:
  // - Removes trailing slashes
  // - Normalizes double slashes
  // - Ensures consistent protocol and hostname format
  // - Validates URL structure
  let googleRedirectUri: string;
  try {
    googleRedirectUri = normalizeRedirectUri(`${cleanBaseUrl}/api/auth/google/callback`);
  } catch (error) {
    // If normalization fails, log error and use basic normalization as fallback
    logger.error('⚠️ Failed to normalize Google OAuth redirect URI:', error);
    googleRedirectUri = `${cleanBaseUrl}/api/auth/google/callback`.replace(/\/+$/, '');
    logger.warn('⚠️ Using fallback redirect URI. This may cause OAuth failures if not configured correctly in Google Cloud Console.');
  }

  // Validate the redirect URI format
  const validation = validateRedirectUri(googleRedirectUri);
  if (!validation.valid) {
    logger.error('⚠️ Invalid Google OAuth redirect URI:', validation.error);
    logger.error('Redirect URI:', googleRedirectUri);
    logger.error('Base URL:', baseUrl);
    logger.error('📝 To fix: Add this EXACT redirect URI to Google Cloud Console:');
    logger.error(`   ${googleRedirectUri}`);
    // Don't throw in production, but log the error
    if (process.env.NODE_ENV === 'development') {
      logger.warn('This may cause OAuth failures. Please check your NEXT_PUBLIC_BASE_URL environment variable.');
      logger.warn('Run "npm run check:oauth" to verify your OAuth configuration.');
    }
  } else {
    // Log the exact redirect URI for easy copy-paste to Google Cloud Console
    if (process.env.NODE_ENV === 'development') {
      logger.info('✅ Google OAuth redirect URI:', googleRedirectUri);
      logger.info('📝 Add this EXACT value to Google Cloud Console → OAuth 2.0 Client IDs → Authorized redirect URIs');
    }
  }

  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // Complete redirect URI stored internally - this is used as redirect_uri when calling Google OAuth
      redirectUri: googleRedirectUri,
      isConfigured: () => {
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        return clientId.trim() !== '' && clientSecret.trim() !== '';
      },
      // Helper to get redirect URI for debugging
      getRedirectUriForConsole: () => {
        return googleRedirectUri;
      },
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      // Complete redirect URI stored internally
      redirectUri: normalizeRedirectUri(`${cleanBaseUrl}/api/auth/facebook/callback`),
      isConfigured: () => {
        const clientId = process.env.FACEBOOK_CLIENT_ID || '';
        const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
        return clientId.trim() !== '' && clientSecret.trim() !== '';
      },
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      keyId: process.env.APPLE_KEY_ID || '',
      privateKey: process.env.APPLE_PRIVATE_KEY || '',
      // Complete redirect URI stored internally
      redirectUri: normalizeRedirectUri(`${cleanBaseUrl}/api/auth/apple/callback`),
      isConfigured: () => {
        const clientId = process.env.APPLE_CLIENT_ID || '';
        const teamId = process.env.APPLE_TEAM_ID || '';
        return clientId.trim() !== '' && teamId.trim() !== '';
      },
    },
  };
}

export const oauthConfig = getOAuthConfig();

// Generate a random state string for OAuth
export function generateState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Verify state string for OAuth
export function verifyState(state: string, savedState: string) {
  return state === savedState;
}

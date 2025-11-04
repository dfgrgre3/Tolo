
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-secret-key');

// Generate a JWT token for the user
export async function generateToken(userId: string, email: string, name?: string) {
  return new SignJWT({ userId, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Verify a JWT token
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch (error) {
    return null;
  }
}

// OAuth configuration with validation
function getOAuthConfig() {
  // Get base URL from environment variable (should be just the domain, e.g., http://localhost:3000)
  // The redirect URI path will be appended automatically
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim();
  
  // Remove trailing slash if present to avoid double slashes
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  
  // Build the complete redirect URI (this is what will be sent to Google OAuth)
  // This must match exactly what is configured in Google Cloud Console
  const googleRedirectUri = `${cleanBaseUrl}/api/auth/google/callback`;
  
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
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      // Complete redirect URI stored internally
      redirectUri: `${cleanBaseUrl}/api/auth/facebook/callback`,
      isConfigured: () => {
        const clientId = process.env.FACEBOOK_CLIENT_ID || '';
        const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
        return clientId.trim() !== '' && clientSecret.trim() !== '';
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

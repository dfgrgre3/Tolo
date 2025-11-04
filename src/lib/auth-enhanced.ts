import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'your-secret-key';

// This file is deprecated. Please use auth-unified.ts instead.
// Re-export everything from auth-unified first
export * from './auth-unified';

// Import with alias to avoid conflicts with export *
import { AuthService as UnifiedAuthService, AuthUser, SessionData } from './auth-unified';

// Re-export AuthService as default for backward compatibility
export { UnifiedAuthService as default };
export { UnifiedAuthService as AuthService };

// Re-export AuthService methods as standalone functions for backward compatibility
export async function createTokens(
  userId: string,
  email: string,
  name?: string,
  role?: string,
  sessionId?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  return UnifiedAuthService.createTokens(
    { id: userId, email, name, role },
    sessionId
  );
}

export async function createSession(
  userId: string,
  userAgent: string,
  ip: string
): Promise<SessionData> {
  return UnifiedAuthService.createSession(userId, userAgent, ip);
}

export async function resetRateLimit(clientId: string): Promise<void> {
  return UnifiedAuthService.resetRateLimit(clientId);
}

export interface DecodedToken {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  sessionId?: string;
}

function extractToken(input: NextRequest | string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return input;
  }

  const authHeader = input.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Support token passed via cookie for SSR utilities
  const tokenCookie = input.cookies.get('authToken')?.value || input.cookies.get('access_token')?.value;
  if (tokenCookie) {
    return tokenCookie;
  }

  return null;
}

export function verifyToken(input: NextRequest | string | null | undefined): DecodedToken | null {
  const token = extractToken(input);
  if (!token || !JWT_SECRET_STRING) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_STRING) as JwtPayload & DecodedToken;

    if (!decoded || !decoded.userId) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function auth(): Promise<{ user: DecodedToken } | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get('authToken')?.value ||
    cookieStore.get('access_token')?.value ||
    null;

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  // Verify session is still valid
  if (decoded.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
  }

  return { user: decoded };
}

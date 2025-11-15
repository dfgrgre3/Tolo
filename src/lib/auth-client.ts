'use client';

import { safeGetItem, safeSetItem, safeRemoveItem } from './safe-client-utils';

import { logger } from '@/lib/logger';

export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  emailVerified?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

let authToken: string | null = null;
let currentUser: User | null = null;

// DEPRECATED: Token is now stored in httpOnly cookie, not localStorage
// These functions are kept for backward compatibility and cleanup of legacy tokens
// New code should rely on cookies only

// Get token from localStorage (legacy - for cleanup only)
// Note: Token is now in httpOnly cookie, this is only for cleaning up old tokens
export function getTokenFromStorage(): string | null {
  return safeGetItem('authToken', { fallback: null });
}

// Save token to localStorage (DEPRECATED - not used anymore)
// Note: Token is now stored in httpOnly cookie by server, not localStorage
// This function is kept for backward compatibility but should not be used
export function saveTokenToStorage(token: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('saveTokenToStorage is deprecated. Token is now in httpOnly cookie.');
  }
  // Don't actually save - token is in cookie
}

// Remove token from localStorage (for cleanup of legacy tokens)
export function removeTokenFromStorage(): void {
  // Clean up any legacy tokens from localStorage
  safeRemoveItem('authToken');
  // Note: User data can stay in localStorage for faster initial render
  // Only token is removed
}

// Get user from localStorage
export function getUserFromStorage(): User | null {
  return safeGetItem('user', { fallback: null });
}

// Save user to localStorage
export function saveUserToStorage(user: User): void {
  safeSetItem('user', user);
}

// Clear user from localStorage
export function removeUserFromStorage(): void {
  safeRemoveItem('user');
}

// Set current auth token (DEPRECATED - token is in httpOnly cookie)
// Note: Token is now stored in httpOnly cookie by server, not in memory or localStorage
// This function is kept for backward compatibility but should not be used
export function setAuthToken(token: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('setAuthToken is deprecated. Token is now in httpOnly cookie.');
  }
  // Don't actually save - token is in cookie
}

// Get current auth token (DEPRECATED - token is in httpOnly cookie)
// Note: Token is now stored in httpOnly cookie, not accessible from JavaScript
// This function is kept for backward compatibility but returns null
export function getAuthToken(): string | null {
  // Token is in httpOnly cookie - not accessible from JavaScript
  // Return null to indicate token should be read from cookie by server
  return null;
}

// Set current user
export function setCurrentUser(user: User): void {
  currentUser = user;
  saveUserToStorage(user);
}

// Get current user
export function getCurrentUser(): User | null {
  if (!currentUser) {
    currentUser = getUserFromStorage();
  }
  return currentUser;
}

// Clear current auth state
export function clearAuthState(): void {
  authToken = null;
  currentUser = null;
  removeTokenFromStorage();
  removeUserFromStorage();
}

// Check if user is authenticated (DEPRECATED - check server instead)
// Note: Token is in httpOnly cookie, not accessible from JavaScript
// This function cannot reliably check authentication - use server-side check instead
export function isAuthenticated(): boolean {
  // Token is in httpOnly cookie - cannot check from client-side
  // Return false to force server-side check
  return false;
}

// Refresh auth token
// Note: Token refresh updates the httpOnly cookie, not localStorage
export async function refreshToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies for refresh
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json') ?? false;
    
    const text = await response.text();
    
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn(
          '[Development] Token refresh: Server returned HTML error page instead of JSON:',
          {
            status: response.status,
            statusText: response.statusText
          }
        );
      }
      clearAuthState();
      return null;
    }

    if (!response.ok) {
      if (isJson) {
        try {
          const errorData = JSON.parse(text);
          logger.error('Token refresh failed:', errorData);
        } catch {}
      }
      clearAuthState();
      return null;
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      logger.error('Failed to parse token refresh response as JSON:', text.substring(0, 100));
      clearAuthState();
      return null;
    }

    if (data.token) {
      return data.token;
    }

    return null;
  } catch (error) {
    logger.error('Token refresh error:', error);
    clearAuthState();
    return null;
  }
}

// Logout user
// Note: Server clears httpOnly cookie, we just clean up local state
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies for logout
    });
  } catch (error) {
    logger.error('Logout error:', error);
  } finally {
    clearAuthState();
  }
}
'use client';

import { safeGetItem, safeSetItem, safeRemoveItem } from './safe-client-utils';

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

// Get token from localStorage
export function getTokenFromStorage(): string | null {
  return safeGetItem('authToken', { fallback: null });
}

// Save token to localStorage
export function saveTokenToStorage(token: string): void {
  safeSetItem('authToken', token);
}

// Remove token from localStorage
export function removeTokenFromStorage(): void {
  safeRemoveItem('authToken');
  safeRemoveItem('user');
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

// Set current auth token
export function setAuthToken(token: string): void {
  authToken = token;
  saveTokenToStorage(token);
}

// Get current auth token
export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = getTokenFromStorage();
  }
  return authToken;
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

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return !!token;
}

// Refresh auth token
export async function refreshToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // التحقق من نوع المحتوى قبل تحليل JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json') ?? false;
    
    // قراءة النص أولاً للتحقق من نوع المحتوى
    const text = await response.text();
    
    // إذا كان HTML، يعني أن هناك خطأ في الخادم (مثل 404 أو 500 صفحة خطأ)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      // فقط في وضع التطوير نُظهر الخطأ التفصيلي
      if (process.env.NODE_ENV === 'development') {
        console.warn(
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
      // محاولة تحليل JSON للرسالة الخطأ
      if (isJson) {
        try {
          const errorData = JSON.parse(text);
          console.error('Token refresh failed:', errorData);
        } catch {
          // لا بأس إذا فشل تحليل JSON
        }
      }
      clearAuthState();
      return null;
    }

    // محاولة تحليل JSON من النص
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse token refresh response as JSON:', text.substring(0, 100));
      clearAuthState();
      return null;
    }

    if (data.token) {
      setAuthToken(data.token);
      return data.token;
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    clearAuthState();
    return null;
  }
}

// Logout user
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthState();
  }
}
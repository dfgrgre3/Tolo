'use client';

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
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

// Save token to localStorage
export function saveTokenToStorage(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
}

// Remove token from localStorage
export function removeTokenFromStorage(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
}

// Get user from localStorage
export function getUserFromStorage(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

// Save user to localStorage
export function saveUserToStorage(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

// Clear user from localStorage
export function removeUserFromStorage(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
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

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    setAuthToken(data.token);
    return data.token;
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
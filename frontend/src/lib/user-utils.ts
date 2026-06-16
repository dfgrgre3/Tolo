'use client';

/**
 * وظائف مساعدة لإدارة معرف المستخدم
 * Helper functions for user ID management
 */

import { safeGetItem, safeSetItem } from './safe-client-utils';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api/api-client';

const LOCAL_USER_KEY = 'tw_user_id';

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || lowered === 'nan') {
    return null;
  }

  return trimmed;
}

async function getAuthenticatedUser(): Promise<string | null> {
  try {
    const data = await apiClient.get<any>('/auth/me');
    const authenticatedId = normalizeUserId(data?.user?.id);
    if (authenticatedId) {
      safeSetItem(LOCAL_USER_KEY, authenticatedId);
      return authenticatedId;
    }
  } catch (error) {
    logger.warn('Unexpected error reading authenticated user:', error);
  }
  return null;
}

async function createGuestUser(): Promise<string | null> {
  try {
    const data = await apiClient.get<any>('/auth/guest');
    
    if (data?.id) {
      const id = normalizeUserId(data.id);
      if (id) {
        safeSetItem(LOCAL_USER_KEY, id);
        return id;
      }
    }
  } catch (error) {
    logger.warn('Unexpected error creating guest user:', error);
  }
  return null;
}

/**
 * التأكد من وجود معرف المستخدم، وإنشاء مستخدم ضيف إذا لزم الأمر
 * Ensure user ID exists, create guest user if needed
 */
export async function ensureUser(): Promise<string> {
  let id: string | null = normalizeUserId(safeGetItem(LOCAL_USER_KEY, { fallback: null }));

  if (id === 'dev-user-id' || id === 'default-user') {
    clearUserId();
    id = null;
  }

  if (id) {
    return id;
  }

  const authId = await getAuthenticatedUser();
  if (authId) return authId;
  
  id = await createGuestUser();
  
  return id || '';
}

/**
 * الحصول على معرف المستخدم من التخزين فقط
 * Get user ID from storage only (without creating)
 */
export function getUserId(): string | null {
  const value = safeGetItem(LOCAL_USER_KEY, { fallback: null });
  return normalizeUserId(value);
}

/**
 * تعيين معرف المستخدم في التخزين
 * Set user ID in storage
 */
export function setUserId(userId: string): boolean {
  const normalized = normalizeUserId(userId);
  if (!normalized) {
    return clearUserId();
  }

  return safeSetItem(LOCAL_USER_KEY, normalized);
}

/**
 * حذف معرف المستخدم من التخزين
 * Remove user ID from storage
 */
export function clearUserId(): boolean {
  return safeSetItem(LOCAL_USER_KEY, null);
}

export { LOCAL_USER_KEY };

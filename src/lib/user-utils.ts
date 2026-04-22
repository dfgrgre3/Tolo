'use client';

/**
 * وظائف مساعدة لإدارة معرف المستخدم
 * Helper functions for user ID management
 */

import { safeGetItem, safeSetItem, safeFetch } from './safe-client-utils';
import { logger } from '@/lib/logger';

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

/**
 * التأكد من وجود معرف المستخدم، وإنشاء مستخدم ضيف إذا لزم الأمر
 * Ensure user ID exists, create guest user if needed
 */
export async function ensureUser(signal?: AbortSignal): Promise<string> {
  let id: string | null = normalizeUserId(safeGetItem(LOCAL_USER_KEY, { fallback: null }));
  
  if (!id) {
    try {
      const { data, error } = await safeFetch<{ id: string }>('/api/users/guest', { 
        method: 'POST',
        signal
      });
      
      if (data?.id) {
        id = normalizeUserId(data.id);
        if (id) {
          safeSetItem(LOCAL_USER_KEY, id);
        }
      } else if (error) {
        logger.warn('Failed to create guest user:', error.message);
      }
    } catch (error) {
      logger.warn('Unexpected error creating guest user:', error);
    }
  }
  
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

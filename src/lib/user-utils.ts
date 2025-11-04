'use client';

/**
 * وظائف مساعدة لإدارة معرف المستخدم
 * Helper functions for user ID management
 */

import { safeGetItem, safeSetItem } from './safe-client-utils';

const LOCAL_USER_KEY = 'tw_user_id';

/**
 * التأكد من وجود معرف المستخدم، وإنشاء مستخدم ضيف إذا لزم الأمر
 * Ensure user ID exists, create guest user if needed
 */
export async function ensureUser(): Promise<string> {
  let id = safeGetItem(LOCAL_USER_KEY, { fallback: null });
  
  if (!id) {
    try {
      const res = await fetch('/api/users/guest', { 
        method: 'POST',
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      
      if (res.ok) {
        const data = await res.json();
        id = data.id;
        if (id) {
          safeSetItem(LOCAL_USER_KEY, id);
        }
      } else {
        console.warn('Failed to create guest user:', res.statusText);
      }
    } catch (error) {
      console.warn('Error creating guest user:', error);
    }
  }
  
  return id || '';
}

/**
 * الحصول على معرف المستخدم من التخزين فقط
 * Get user ID from storage only (without creating)
 */
export function getUserId(): string | null {
  return safeGetItem(LOCAL_USER_KEY, { fallback: null });
}

/**
 * تعيين معرف المستخدم في التخزين
 * Set user ID in storage
 */
export function setUserId(userId: string): boolean {
  return safeSetItem(LOCAL_USER_KEY, userId);
}

/**
 * حذف معرف المستخدم من التخزين
 * Remove user ID from storage
 */
export function clearUserId(): boolean {
  return safeSetItem(LOCAL_USER_KEY, null);
}

export { LOCAL_USER_KEY };


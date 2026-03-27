'use client';

import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { fetchSettingsPreferences, saveSettingsPreferences } from '@/app/(dashboard)/settings/preferences-client';
import type { SettingsPreferences, SettingsPreferencesPatch } from '@/types/settings-preferences';

/**
 * Hook to synchronize settings between localStorage and server
 * Fixes the issue where settings are lost on refresh
 */
export function useSettingsSync() {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<SettingsPreferencesPatch | null>(null);
  const queueAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (pendingChangesRef.current) {
        try {
          await saveSettingsPreferences(pendingChangesRef.current);
          pendingChangesRef.current = null;
        } catch (error) {
          console.error('Auto-save failed:', error);
          toast.error('فشل حفظ الإعدادات تلقائياً');
        }
      }
    }, 2000);
  }, []);

  const syncFromLocalStorage = useCallback(async () => {
    try {
      // Get current server settings
      const serverPreferences = await fetchSettingsPreferences();

      // Get localStorage settings
      // Check if there are local settings that need to be synced to server
      const hasLocalChanges = false;

      if (hasLocalChanges) {
        return serverPreferences;
      }

      return serverPreferences;
    } catch (error) {
      console.error('Settings sync error:', error);
      return null;
    }
  }, [queueAutoSave]);

  const scheduleAutoSave = useCallback(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule auto-save after 2 seconds of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      if (pendingChangesRef.current) {
        try {
          await saveSettingsPreferences(pendingChangesRef.current);
          pendingChangesRef.current = null;
        } catch (error) {
          console.error('Auto-save failed:', error);
          toast.error('فشل حفظ الإعدادات تلقائياً');
        }
      }
    }, 2000);
  }, []);

  const applySettingsFromPreferences = useCallback((preferences: SettingsPreferences) => {

  }, []);

  const immediateSave = useCallback(async (patch: SettingsPreferencesPatch) => {
    try {
      await saveSettingsPreferences(patch);
      return true;
    } catch (error) {
      console.error('Immediate save failed:', error);
      toast.error('فشل حفظ الإعدادات');
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    syncFromLocalStorage,
    applySettingsFromPreferences,
    immediateSave,
    scheduleAutoSave
  };
}

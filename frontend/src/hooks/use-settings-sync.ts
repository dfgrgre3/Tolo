'use client';

import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { fetchSettingsPreferences, saveSettingsPreferences } from '@/app/(dashboard)/settings/preferences-client';
import type { SettingsPreferences, SettingsPreferencesPatch } from '@/types/user-ui-preferences';

import { logger } from '@/lib/logger';

export function useSettingsSync() {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<SettingsPreferencesPatch | null>(null);

  const scheduleAutoSave = useCallback((patch: SettingsPreferencesPatch) => {
    const current = pendingChangesRef.current || {};
    
    pendingChangesRef.current = {
      ...current,
      ...(patch.appearance ? {
        appearance: {
          ...current.appearance,
          ...patch.appearance,
        }
      } : {}),
      ...(patch.language ? {
        language: {
          ...current.language,
          ...patch.language,
        }
      } : {}),
      ...(patch.notifications ? {
        notifications: {
          ...current.notifications,
          ...patch.notifications,
        }
      } : {}),
      ...(patch.privacy ? {
        privacy: {
          ...current.privacy,
          ...patch.privacy,
        }
      } : {}),
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const changes = pendingChangesRef.current;
      if (changes && Object.keys(changes).length > 0) {
        pendingChangesRef.current = null;
        try {
          logger.info('Auto-saving accumulated settings:', changes);
          await saveSettingsPreferences(changes);
        } catch (error) {
          logger.error('Auto-save settings failed:', error);
          toast.error('فشل حفظ الإعدادات تلقائياً');
          pendingChangesRef.current = {
            ...changes,
            ...(pendingChangesRef.current || {}),
          };
        }
      }
    }, 2000);
  }, []);

  const syncFromLocalStorage = useCallback(async () => {
    try {
      const serverPreferences = await fetchSettingsPreferences();
      return serverPreferences;
    } catch (error) {
      logger.error('Settings sync error:', error);
      return null;
    }
  }, []);

  const applySettingsFromPreferences = useCallback((_preferences: SettingsPreferences) => {
    // Can be used to apply theme or language settings globally if needed
  }, []);

  const immediateSave = useCallback(async (patch: SettingsPreferencesPatch) => {
    const current = pendingChangesRef.current || {};
    const mergedPatch = {
      ...current,
      ...patch,
      appearance: { ...current.appearance, ...patch.appearance },
      language: { ...current.language, ...patch.language },
      notifications: { ...current.notifications, ...patch.notifications },
      privacy: { ...current.privacy, ...patch.privacy },
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingChangesRef.current = null;

    try {
      await saveSettingsPreferences(mergedPatch);
      return true;
    } catch (error) {
      logger.error('Immediate save failed:', error);
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
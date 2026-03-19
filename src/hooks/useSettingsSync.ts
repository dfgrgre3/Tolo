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

  const syncFromLocalStorage = useCallback(async () => {
    try {
      // Get current server settings
      const serverPreferences = await fetchSettingsPreferences();

      // Get localStorage settings
      const localLanguage = localStorage.getItem('language');
      const localDirection = localStorage.getItem('direction');
      const localNumberFormat = localStorage.getItem('numberFormat');
      const localTimezone = localStorage.getItem('timezone');
      const localTheme = localStorage.getItem('theme');
      const localFontSize = localStorage.getItem('fontSize');

      // Check if there are local settings that need to be synced to server
      const hasLocalChanges =
        localLanguage ||
        localDirection ||
        localNumberFormat ||
        localTimezone ||
        localTheme ||
        localFontSize;

      if (hasLocalChanges) {
        // Apply local settings immediately for visual feedback
        if (localLanguage) {
          document.documentElement.lang = localLanguage;
        }
        if (localDirection) {
          document.documentElement.dir = localDirection;
        }
        if (localNumberFormat === 'arabic') {
          document.documentElement.classList.add('arabic-numbers');
        } else if (localNumberFormat === 'english') {
          document.documentElement.classList.remove('arabic-numbers');
        }
        if (localTheme) {
          document.documentElement.classList.toggle('dark', localTheme === 'dark');
        }
        if (localFontSize) {
          const fontSizeMap = {
            'small': '14px',
            'medium': '16px',
            'large': '18px'
          };
          document.documentElement.style.fontSize = fontSizeMap[localFontSize as keyof typeof fontSizeMap] || '16px';
        }

        // Return the merged preferences for saving
        const patch: SettingsPreferencesPatch = {};

        if (localLanguage || localDirection || localNumberFormat || localTimezone) {
          patch.language = {
            ...serverPreferences.language,
            ...(localLanguage && { language: localLanguage }),
            ...(localDirection && { direction: localDirection as 'rtl' | 'ltr' }),
            ...(localNumberFormat && { numberFormat: localNumberFormat as 'arabic' | 'english' }),
            ...(localTimezone && { timezone: localTimezone }),
          };
        }

        if (localTheme || localFontSize) {
          patch.appearance = {
            ...serverPreferences.appearance,
            ...(localTheme && { theme: localTheme as 'light' | 'dark' | 'system' }),
            ...(localFontSize && { fontSize: localFontSize as 'small' | 'medium' | 'large' }),
          };
        }

        // Auto-save local changes to server
        if (Object.keys(patch).length > 0) {
          pendingChangesRef.current = patch;
          scheduleAutoSave();
        }

        return {
          ...serverPreferences,
          ...patch
        } as SettingsPreferences;
      }

      return serverPreferences;
    } catch (error) {
      console.error('Settings sync error:', error);
      return null;
    }
  }, []);

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
    // Apply language settings
    if (preferences.language) {
      const { language, numberFormat, timezone } = preferences.language;

      // Apply language and direction
      const langMap: Record<string, 'rtl' | 'ltr'> = {
        'ar': 'rtl',
        'ur': 'rtl',
        'en': 'ltr',
        'fr': 'ltr'
      };

      document.documentElement.lang = language;
      document.documentElement.dir = langMap[language] || 'ltr';

      // Store in localStorage for persistence
      localStorage.setItem('language', language);
      localStorage.setItem('direction', langMap[language] || 'ltr');

      // Apply number format
      document.documentElement.classList.toggle('arabic-numbers', numberFormat === 'arabic');
      localStorage.setItem('numberFormat', numberFormat);

      // Apply timezone
      localStorage.setItem('timezone', timezone);
    }

    // Apply appearance settings
    if (preferences.appearance) {
      const { theme, fontSize } = preferences.appearance;

      // Apply theme
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('theme', theme);

      // Apply font size
      const fontSizeMap = {
        'small': '14px',
        'medium': '16px',
        'large': '18px'
      };
      document.documentElement.style.fontSize = fontSizeMap[fontSize as keyof typeof fontSizeMap] || '16px';
      localStorage.setItem('fontSize', fontSize);
    }
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

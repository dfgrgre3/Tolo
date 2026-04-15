'use client';

import { fetchSettingsPreferences } from '@/app/(dashboard)/settings/preferences-client';
import type { SettingsPreferences, LanguageSettingsPreference, AppearanceSettingsPreference } from '@/types/settings-preferences';
import { logger } from '@/lib/logger';

/**
 * Global settings initializer that runs on app startup
 * Ensures all settings are properly synchronized between localStorage and server
 */
class SettingsInitializer {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Get server settings
      const serverPreferences = await fetchSettingsPreferences();

      // Apply all settings to ensure consistency
      this.applyLanguageSettings((serverPreferences as any).language);
      this.applyAppearanceSettings((serverPreferences as any).appearance);

      this.initialized = true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        // User not authenticated, skip initialization silently
        this.initialized = true;
        return;
      }
      logger.error('Settings initialization failed:', error);
      // Still mark as initialized to prevent repeated failures
      this.initialized = true;
    }
  }

  private applyLanguageSettings(language: LanguageSettingsPreference): void {
    if (!language) return;

    const langMap: Record<string, 'rtl' | 'ltr'> = {
      'ar': 'rtl',
      'ur': 'rtl',
      'en': 'ltr',
      'fr': 'ltr'
    };

    // Apply language and direction
    document.documentElement.lang = language.language;
    document.documentElement.dir = langMap[language.language] || 'ltr';

    // Store in localStorage for persistence
    localStorage.setItem('language', language.language);
    localStorage.setItem('direction', langMap[language.language] || 'ltr');

    // Apply number format
    document.documentElement.classList.toggle('arabic-numbers', language.numberFormat === 'arabic');
    localStorage.setItem('numberFormat', language.numberFormat);

    // Apply timezone
    localStorage.setItem('timezone', language.timezone);
  }

  private applyAppearanceSettings(appearance: AppearanceSettingsPreference): void {
    if (!appearance) return;

    // Apply theme
    document.documentElement.classList.toggle('dark', appearance.theme === 'dark');
    localStorage.setItem('theme', appearance.theme);

    // Apply font size
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px',
      'large': '18px'
    };
    document.documentElement.style.fontSize = fontSizeMap[appearance.fontSize as keyof typeof fontSizeMap] || '16px';
    localStorage.setItem('fontSize', appearance.fontSize);
  }

  // Method to manually sync settings when needed
  async syncSettings(): Promise<void> {
    this.initialized = false;
    this.initPromise = null;
    await this.initialize();
  }
}

// Export singleton instance
export const settingsInitializer = new SettingsInitializer();

// Export convenience function
export const initializeSettings = () => settingsInitializer.initialize();

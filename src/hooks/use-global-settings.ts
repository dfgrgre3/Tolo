'use client';

/**
 * useGlobalSettings - Hook لتطبيق إعدادات المستخدم على كامل التطبيق
 *
 * يقوم بـ:
 * 1. تحميل إعدادات المستخدم عند تسجيل الدخول
 * 2. تطبيق السمة (theme) ولون الخط والمظهر على الـ DOM
 * 3. تطبيق إعدادات اللغة والتوجيه (RTL/LTR)
 * 4. حفظ الإعدادات في localStorage لاستعادتها بسرعة
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

export function useGlobalSettings() {
  const { user, isLoading } = useAuth();
  const settingsLoadedRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  const applyTheme = useCallback((theme: string) => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('theme', theme);
  }, []);

  const applyFontSize = useCallback((fontSize: string) => {
    const sizes: Record<string, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px',
    };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
    localStorage.setItem('fontSize', fontSize);
  }, []);

  const applyColors = useCallback((primaryColor: string, accentColor: string) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-accent', accentColor);
    localStorage.setItem('primaryColor', primaryColor);
    localStorage.setItem('accentColor', accentColor);
  }, []);

  const applyLanguage = useCallback((language: string) => {
    const langDirMap: Record<string, 'rtl' | 'ltr'> = {
      ar: 'rtl',
      ur: 'rtl',
      en: 'ltr',
      fr: 'ltr',
    };
    document.documentElement.lang = language;
    document.documentElement.dir = langDirMap[language] || 'ltr';
    localStorage.setItem('language', language);
    localStorage.setItem('direction', langDirMap[language] || 'ltr');
  }, []);

  const applyNumberFormat = useCallback((numberFormat: string) => {
    document.documentElement.classList.toggle('arabic-numbers', numberFormat === 'arabic');
    localStorage.setItem('numberFormat', numberFormat);
  }, []);

  const applyReducedMotion = useCallback((reducedMotion: boolean) => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, []);

  const applyHighContrast = useCallback((highContrast: boolean) => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, []);

  const applyCompactMode = useCallback((compactMode: boolean) => {
    document.documentElement.classList.toggle('compact-mode', compactMode);
  }, []);

  // تطبيق الإعدادات المحفوظة من localStorage على الفور (بدون انتظار API)
  const applyFromLocalStorage = useCallback(() => {
    try {
      const theme = localStorage.getItem('theme') || 'dark';
      const fontSize = localStorage.getItem('fontSize') || 'medium';
      const language = localStorage.getItem('language') || 'ar';
      const direction = localStorage.getItem('direction') || 'rtl';
      const numberFormat = localStorage.getItem('numberFormat') || 'english';
      const primaryColor = localStorage.getItem('primaryColor');
      const accentColor = localStorage.getItem('accentColor');

      applyTheme(theme);
      applyFontSize(fontSize);

      document.documentElement.lang = language;
      document.documentElement.dir = direction;
      document.documentElement.classList.toggle('arabic-numbers', numberFormat === 'arabic');

      if (primaryColor && accentColor) {
        applyColors(primaryColor, accentColor);
      }
    } catch (err) {
      console.warn('[useGlobalSettings] Failed to apply from localStorage:', err);
    }
  }, [applyTheme, applyFontSize, applyColors]);

  // تحميل الإعدادات من الـ server عند تسجيل الدخول
  const loadAndApplyServerSettings = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/settings/preferences', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) return;

      const data = await response.json();
      const preferences = data.preferences;

      if (!preferences) return;

      // تطبيق إعدادات المظهر
      if (preferences.appearance) {
        const { theme, fontSize, primaryColor, accentColor, reducedMotion, highContrast, compactMode } =
          preferences.appearance;

        if (theme) applyTheme(theme);
        if (fontSize) applyFontSize(fontSize);
        if (primaryColor && accentColor) applyColors(primaryColor, accentColor);
        if (reducedMotion !== undefined) applyReducedMotion(reducedMotion);
        if (highContrast !== undefined) applyHighContrast(highContrast);
        if (compactMode !== undefined) applyCompactMode(compactMode);
      }

      // تطبيق إعدادات اللغة
      if (preferences.language) {
        const { language, numberFormat } = preferences.language;
        if (language) applyLanguage(language);
        if (numberFormat) applyNumberFormat(numberFormat);
      }

      settingsLoadedRef.current = true;
    } catch (err) {
      console.warn('[useGlobalSettings] Failed to load server settings:', err);
    }
  }, [user?.id, applyTheme, applyFontSize, applyColors, applyLanguage, applyNumberFormat, applyReducedMotion, applyHighContrast, applyCompactMode]);

  // عند التحميل الأول: تطبيق الإعدادات المحلية فوراً
  useEffect(() => {
    applyFromLocalStorage();
  }, [applyFromLocalStorage]);

  // عند تسجيل الدخول: تحميل الإعدادات من الـ server
  useEffect(() => {
    if (isLoading || !user?.id) return;

    const isNewUser = user.id !== prevUserIdRef.current;

    if (isNewUser || !settingsLoadedRef.current) {
      prevUserIdRef.current = user.id;
      settingsLoadedRef.current = false;
      loadAndApplyServerSettings();
    }
  }, [user?.id, isLoading, loadAndApplyServerSettings]);

  // عند تسجيل الخروج: إعادة تعيين الإعدادات
  useEffect(() => {
    if (!isLoading && !user) {
      if (prevUserIdRef.current) {
        // المستخدم خرج - إعادة تطبيق الإعدادات الافتراضية
        prevUserIdRef.current = null;
        settingsLoadedRef.current = false;
        // إعادة تعيين إلى الإعدادات من localStorage
        applyFromLocalStorage();
      }
    }
  }, [user, isLoading, applyFromLocalStorage]);
}

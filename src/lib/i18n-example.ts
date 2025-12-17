/**
 * Example usage of the secure i18n utility
 * Demonstrates best practices for internationalization
 */

import { createTranslator, sanitizeTranslations } from './i18n';

// ============================================================================
// 1. Define your translations
// ============================================================================

const arabicTranslations = {
  auth: {
    login: {
      title: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      button: 'دخول',
      forgotPassword: 'نسيت كلمة المرور؟',
      noAccount: 'ليس لديك حساب؟',
      signUp: 'إنشاء حساب',
    },
    register: {
      title: 'إنشاء حساب جديد',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      button: 'تسجيل',
      haveAccount: 'لديك حساب؟',
      signIn: 'تسجيل الدخول',
    },
    errors: {
      invalidEmail: 'البريد الإلكتروني غير صالح',
      invalidPassword: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      userNotFound: 'المستخدم غير موجود',
      wrongPassword: 'كلمة المرور غير صحيحة',
    },
  },
  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    confirm: 'تأكيد',
    loading: 'جاري التحميل...',
    success: 'تم بنجاح',
    error: 'حدث خطأ',
  },
  dashboard: {
    welcome: 'مرحباً',
    stats: {
      users: 'المستخدمين',
      posts: 'المنشورات',
      comments: 'التعليقات',
      views: 'المشاهدات',
    },
  },
};

// English fallback translations
const englishTranslations = {
  auth: {
    login: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      button: 'Sign In',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
    },
    register: {
      title: 'Create New Account',
      name: 'Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      button: 'Register',
      haveAccount: 'Already have an account?',
      signIn: 'Sign In',
    },
    errors: {
      invalidEmail: 'Invalid email address',
      invalidPassword: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      userNotFound: 'User not found',
      wrongPassword: 'Incorrect password',
    },
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
  },
  dashboard: {
    welcome: 'Welcome',
    stats: {
      users: 'Users',
      posts: 'Posts',
      comments: 'Comments',
      views: 'Views',
    },
  },
};

// ============================================================================
// 2. Create translator instances
// ============================================================================

// Arabic translator with English fallback
export const t = createTranslator(arabicTranslations, englishTranslations);

// English-only translator
export const tEn = createTranslator(englishTranslations);

// ============================================================================
// 3. Usage examples
// ============================================================================

// Basic usage
// console.log(t('auth.login.title')); // Output: 'تسجيل الدخول'
// console.log(t('common.save')); // Output: 'حفظ'

// With fallback
// console.log(t('missing.key', 'Default Value')); // Output: 'Default Value'

// Nested translations
// console.log(t('dashboard.stats.users')); // Output: 'المستخدمين'

// ============================================================================
// 4. React Component Example
// ============================================================================

/*
import React from 'react';
import { t } from '@/lib/i18n-example';

export function LoginForm() {
  return (
    <div>
      <h1>{t('auth.login.title')}</h1>
      <form>
        <label>
          {t('auth.login.email')}
          <input type="email" />
        </label>
        <label>
          {t('auth.login.password')}
          <input type="password" />
        </label>
        <button type="submit">{t('auth.login.button')}</button>
        <a href="/forgot-password">{t('auth.login.forgotPassword')}</a>
      </form>
    </div>
  );
}
*/

// ============================================================================
// 5. Handling user-provided translations (IMPORTANT FOR SECURITY)
// ============================================================================

/**
 * If you're loading translations from an external source (API, user input, etc.),
 * ALWAYS sanitize them first to prevent prototype pollution attacks
 */
export function loadExternalTranslations(externalData: any) {
  // ❌ NEVER DO THIS:
  // const t = createTranslator(externalData);

  // ✅ ALWAYS DO THIS:
  const sanitized = sanitizeTranslations(externalData);
  const t = createTranslator(sanitized, englishTranslations);

  return t;
}

// Example: Loading from API
/*
async function loadTranslationsFromAPI(locale: string) {
  const response = await fetch(`/api/translations/${locale}`);
  const data = await response.json();
  
  // Sanitize before using
  const sanitized = sanitizeTranslations(data);
  return createTranslator(sanitized, englishTranslations);
}
*/

// ============================================================================
// 6. Dynamic locale switching
// ============================================================================

type Locale = 'ar' | 'en';

const translations: Record<Locale, any> = {
  ar: arabicTranslations,
  en: englishTranslations,
};

export function createLocaleTranslator(locale: Locale) {
  const primary = translations[locale];
  const fallback = locale === 'ar' ? englishTranslations : undefined;

  return createTranslator(primary, fallback);
}

// Usage:
// const currentLocale: Locale = 'ar';
// const t = createLocaleTranslator(currentLocale);

// ============================================================================
// 7. Type-safe translations (Optional but recommended)
// ============================================================================

/**
 * For better TypeScript support, you can create a type-safe wrapper
 */
type TranslationKey =
  | 'auth.login.title'
  | 'auth.login.email'
  | 'auth.login.password'
  | 'auth.login.button'
  | 'common.save'
  | 'common.cancel'
// ... add all your keys here

export function typedT(key: TranslationKey, fallback?: string): string {
  return t(key, fallback);
}

// Usage:
// typedT('auth.login.title'); // ✅ Type-safe
// typedT('invalid.key'); // ❌ TypeScript error

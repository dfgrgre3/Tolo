/**
 * Secure i18n (internationalization) utility
 * Implements protection against prototype pollution attacks
 */

import { logger } from '@/lib/logger';

type TranslationValue = string | Record<string, unknown>;
type Translations = Record<string, TranslationValue>;

/**
 * Dangerous property names that could lead to prototype pollution
 */
const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toString',
  'valueOf',
  'toLocaleString',
]);

/**
 * Check if a key is safe to access
 */
function isSafeKey(key: string): boolean {
  return !DANGEROUS_KEYS.has(key);
}

/**
 * Safely get a nested property from an object
 * Uses Object.hasOwnProperty.call() to prevent prototype pollution
 */
function safeGet(obj: unknown, key: string): unknown {
  // Validate key is safe
  if (!isSafeKey(key)) {
    logger.warn(`[i18n] Blocked access to dangerous property: ${key}`);
    return undefined;
  }

  // Use Object.hasOwnProperty.call() instead of 'in' operator
  // This ensures we only access own properties, not inherited ones
  if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key)) {
    return (obj as Record<string, unknown>)[key];
  }

  return undefined;
}

/**
 * Get a translation value by key path
 * @param translations - Translation object
 * @param keyPath - Dot-separated key path (e.g., "auth.login.title")
 * @param fallback - Fallback value if key not found
 * @returns Translation string or fallback
 */
export function getTranslation(
  translations: Translations,
  keyPath: string,
  fallback?: string
): string {
  // Validate inputs
  if (!translations || typeof translations !== 'object') {
    logger.warn('[i18n] Invalid translations object');
    return fallback || keyPath;
  }

  if (!keyPath || typeof keyPath !== 'string') {
    logger.warn('[i18n] Invalid key path');
    return fallback || '';
  }

  // Split the key path
  const keys = keyPath.split('.');

  // Validate all keys are safe before processing
  for (const key of keys) {
    if (!isSafeKey(key)) {
      logger.warn(`[i18n] Blocked dangerous key in path: ${keyPath}`);
      return fallback || keyPath;
    }
  }

  // Navigate through the object safely
  let value: unknown = translations;

  for (const key of keys) {
    // Use safe getter that checks hasOwnProperty
    value = safeGet(value, key);

    if (value === undefined) {
      // Key not found, return fallback
      return fallback || keyPath;
    }
  }

  // Return the value if it's a string, otherwise return fallback
  if (typeof value === 'string') {
    return value;
  }

  logger.warn(`[i18n] Translation value is not a string for key: ${keyPath}`);
  return fallback || keyPath;
}

/**
 * Create a translation function for a specific locale
 * @param translations - Translation object for the locale
 * @param fallbackTranslations - Optional fallback translations (e.g., English)
 * @returns Translation function
 */
export function createTranslator(
  translations: Translations,
  fallbackTranslations?: Translations
) {
  return (keyPath: string, fallback?: string): string => {
    // Try primary translations first
    const primaryValue = getTranslation(translations, keyPath);

    // If not found and we have fallback translations, try those
    if (primaryValue === keyPath && fallbackTranslations) {
      const fallbackValue = getTranslation(fallbackTranslations, keyPath);
      if (fallbackValue !== keyPath) {
        return fallbackValue;
      }
    }

    // Return the provided fallback or the key itself
    return primaryValue !== keyPath ? primaryValue : (fallback || keyPath);
  };
}

/**
 * Safely merge translation objects
 * Creates a new object without modifying prototypes
 */
export function mergeTranslations(
  base: Translations,
  override: Translations
): Translations {
  // Create object with null prototype to prevent pollution
  const result = Object.create(null);

  // Copy base translations
  for (const key in base) {
    if (Object.prototype.hasOwnProperty.call(base, key) && isSafeKey(key)) {
      result[key] = base[key];
    }
  }

  // Override with new translations
  for (const key in override) {
    if (Object.prototype.hasOwnProperty.call(override, key) && isSafeKey(key)) {
      result[key] = override[key];
    }
  }

  return result;
}

/**
 * Validate and sanitize a translations object
 * Removes any dangerous keys and creates a safe copy
 */
export function sanitizeTranslations(translations: unknown): Translations {
  if (!translations || typeof translations !== 'object') {
    return Object.create(null);
  }

  // Create object with null prototype
  const sanitized = Object.create(null);

  for (const key in translations) {
    // Only copy own properties with safe keys
    if (Object.prototype.hasOwnProperty.call(translations, key) && isSafeKey(key)) {
      const value = (translations as Record<string, unknown>)[key];

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeTranslations(value);
      } else if (typeof value === 'string') {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Example usage:
 * 
 * const translations = {
 *   auth: {
 *     login: {
 *       title: 'تسجيل الدخول',
 *       button: 'دخول'
 *     }
 *   }
 * };
 * 
 * const t = createTranslator(translations);
 * logger.info(t('auth.login.title')); // 'تسجيل الدخول'
 * logger.info(t('auth.login.missing', 'Default')); // 'Default'
 */

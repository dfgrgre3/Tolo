/**
 * Tests for secure i18n utility
 * Verifies protection against prototype pollution attacks
 */

import {
  getTranslation,
  createTranslator,
  mergeTranslations,
  sanitizeTranslations,
} from '@/lib/i18n';

describe('i18n Security Tests', () => {
  const mockTranslations = {
    auth: {
      login: {
        title: 'تسجيل الدخول',
        button: 'دخول',
      },
      register: {
        title: 'إنشاء حساب',
      },
    },
    common: {
      save: 'حفظ',
      cancel: 'إلغاء',
    },
  };

  describe('getTranslation', () => {
    it('should get nested translation values', () => {
      expect(getTranslation(mockTranslations, 'auth.login.title')).toBe('تسجيل الدخول');
      expect(getTranslation(mockTranslations, 'common.save')).toBe('حفظ');
    });

    it('should return fallback for missing keys', () => {
      expect(getTranslation(mockTranslations, 'missing.key', 'Fallback')).toBe('Fallback');
    });

    it('should return key path if no fallback provided', () => {
      expect(getTranslation(mockTranslations, 'missing.key')).toBe('missing.key');
    });

    it('should block access to __proto__', () => {
      const result = getTranslation(mockTranslations, '__proto__.polluted', 'Safe');
      expect(result).toBe('Safe');
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should block access to constructor', () => {
      const result = getTranslation(mockTranslations, 'constructor.polluted', 'Safe');
      expect(result).toBe('Safe');
    });

    it('should block access to prototype', () => {
      const result = getTranslation(mockTranslations, 'prototype.polluted', 'Safe');
      expect(result).toBe('Safe');
    });

    it('should block nested dangerous keys', () => {
      const result = getTranslation(mockTranslations, 'auth.__proto__.polluted', 'Safe');
      expect(result).toBe('Safe');
    });

    it('should handle invalid inputs gracefully', () => {
      expect(getTranslation(null as any, 'key', 'Fallback')).toBe('Fallback');
      expect(getTranslation(mockTranslations, '', 'Fallback')).toBe('Fallback');
      expect(getTranslation(mockTranslations, null as any, 'Fallback')).toBe('Fallback');
    });
  });

  describe('createTranslator', () => {
    const fallbackTranslations = {
      auth: {
        login: {
          title: 'Login',
          button: 'Sign In',
        },
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
      },
    };

    it('should create a translator function', () => {
      const t = createTranslator(mockTranslations);
      expect(t('auth.login.title')).toBe('تسجيل الدخول');
    });

    it('should fall back to fallback translations', () => {
      const t = createTranslator(mockTranslations, fallbackTranslations);
      expect(t('common.delete')).toBe('Delete'); // Not in primary, found in fallback
    });

    it('should use custom fallback if provided', () => {
      const t = createTranslator(mockTranslations);
      expect(t('missing.key', 'Custom Fallback')).toBe('Custom Fallback');
    });

    it('should block dangerous keys in translator', () => {
      const t = createTranslator(mockTranslations);
      expect(t('__proto__.polluted', 'Safe')).toBe('Safe');
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  describe('mergeTranslations', () => {
    it('should merge two translation objects', () => {
      const base = { a: 'A', b: 'B' };
      const override = { b: 'B2', c: 'C' };
      const result = mergeTranslations(base, override);
      
      expect(result.a).toBe('A');
      expect(result.b).toBe('B2');
      expect(result.c).toBe('C');
    });

    it('should not pollute prototypes when merging', () => {
      const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}}');
      const base = { safe: 'value' };
      
      const result = mergeTranslations(base, malicious);
      
      expect(result.safe).toBe('value');
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(result.__proto__).toBeUndefined();
    });

    it('should create object with null prototype', () => {
      const result = mergeTranslations({ a: 'A' }, { b: 'B' });
      expect(Object.getPrototypeOf(result)).toBeNull();
    });
  });

  describe('sanitizeTranslations', () => {
    it('should remove dangerous keys', () => {
      const unsafe = {
        safe: 'value',
        __proto__: { polluted: 'yes' },
        constructor: { bad: 'value' },
        prototype: { evil: 'value' },
      };

      const result = sanitizeTranslations(unsafe);
      
      expect(result.safe).toBe('value');
      expect(result.__proto__).toBeUndefined();
      expect(result.constructor).toBeUndefined();
      expect(result.prototype).toBeUndefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should recursively sanitize nested objects', () => {
      const unsafe = {
        level1: {
          safe: 'value',
          __proto__: { bad: 'value' },
          level2: {
            safe: 'value2',
            constructor: { bad: 'value' },
          },
        },
      };

      const result = sanitizeTranslations(unsafe);
      
      expect((result.level1 as any).safe).toBe('value');
      expect((result.level1 as any).__proto__).toBeUndefined();
      expect((result.level1 as any).level2.safe).toBe('value2');
      expect((result.level1 as any).level2.constructor).toBeUndefined();
    });

    it('should create object with null prototype', () => {
      const result = sanitizeTranslations({ a: 'A' });
      expect(Object.getPrototypeOf(result)).toBeNull();
    });

    it('should handle invalid inputs', () => {
      expect(sanitizeTranslations(null)).toEqual({});
      expect(sanitizeTranslations(undefined)).toEqual({});
      expect(sanitizeTranslations('string' as any)).toEqual({});
    });

    it('should only keep string values and objects', () => {
      const input = {
        string: 'value',
        number: 123,
        boolean: true,
        null: null,
        undefined: undefined,
        function: () => {},
        nested: {
          value: 'nested',
        },
      };

      const result = sanitizeTranslations(input);
      
      expect(result.string).toBe('value');
      expect(result.number).toBeUndefined();
      expect(result.boolean).toBeUndefined();
      expect(result.null).toBeUndefined();
      expect(result.undefined).toBeUndefined();
      expect(result.function).toBeUndefined();
      expect((result.nested as any).value).toBe('nested');
    });
  });

  describe('Prototype Pollution Attack Scenarios', () => {
    it('should prevent pollution via JSON.parse', () => {
      const maliciousJSON = '{"__proto__": {"polluted": "yes"}}';
      const parsed = JSON.parse(maliciousJSON);
      const sanitized = sanitizeTranslations(parsed);
      
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(sanitized.__proto__).toBeUndefined();
    });

    it('should prevent pollution via nested paths', () => {
      const malicious = {
        a: {
          b: {
            __proto__: {
              polluted: 'yes',
            },
          },
        },
      };

      const result = getTranslation(malicious, 'a.b.__proto__.polluted', 'Safe');
      expect(result).toBe('Safe');
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should prevent pollution via constructor.prototype', () => {
      const malicious = {
        constructor: {
          prototype: {
            polluted: 'yes',
          },
        },
      };

      const result = getTranslation(malicious, 'constructor.prototype.polluted', 'Safe');
      expect(result).toBe('Safe');
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });
});

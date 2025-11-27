import { describe, it, expect } from '@jest/globals';
import { isSafeUrl, sanitizeUrl, safeNavigate } from '../url-validator';

describe('URL Validator', () => {
  describe('isSafeUrl', () => {
    it('should allow relative URLs', () => {
      expect(isSafeUrl('/dashboard')).toBe(true);
      expect(isSafeUrl('/api/users')).toBe(true);
      expect(isSafeUrl('./relative')).toBe(true);
      expect(isSafeUrl('../parent')).toBe(true);
    });

    it('should allow safe absolute URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://example.com')).toBe(true);
      expect(isSafeUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('should block javascript: protocol', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('JavaScript:alert(1)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
    });

    it('should block data: protocol', () => {
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('DATA:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should block vbscript: protocol', () => {
      expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeUrl('VBScript:msgbox(1)')).toBe(false);
    });

    it('should block file: protocol', () => {
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeUrl('FILE:///etc/passwd')).toBe(false);
    });

    it('should block about: protocol', () => {
      expect(isSafeUrl('about:blank')).toBe(false);
      expect(isSafeUrl('ABOUT:blank')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl('   ')).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(isSafeUrl(123 as any)).toBe(false);
      expect(isSafeUrl({} as any)).toBe(false);
      expect(isSafeUrl([] as any)).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(isSafeUrl('  /dashboard  ')).toBe(true);
      expect(isSafeUrl('  javascript:alert(1)  ')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return safe URLs unchanged', () => {
      expect(sanitizeUrl('/dashboard')).toBe('/dashboard');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should return fallback for unsafe URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('/');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('/');
    });

    it('should use custom fallback', () => {
      expect(sanitizeUrl('javascript:alert(1)', '/home')).toBe('/home');
      expect(sanitizeUrl(null, '/error')).toBe('/error');
    });

    it('should trim whitespace from safe URLs', () => {
      expect(sanitizeUrl('  /dashboard  ')).toBe('/dashboard');
    });
  });

  describe('safeNavigate', () => {
    // Mock window.location
    const originalLocation = window.location;

    beforeEach(() => {
      delete (window as any).location;
      (window as any).location = { href: '' };
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should navigate to safe URLs', () => {
      safeNavigate('/dashboard');
      expect(window.location.href).toBe('/dashboard');
    });

    it('should navigate to fallback for unsafe URLs', () => {
      safeNavigate('javascript:alert(1)');
      expect(window.location.href).toBe('/');
    });

    it('should use custom fallback', () => {
      safeNavigate('javascript:alert(1)', '/home');
      expect(window.location.href).toBe('/home');
    });
  });
});

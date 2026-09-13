import { beforeEach, describe, expect, it } from 'vitest';
import { __resetBackendUrlCache, getBackendApiUrl } from './backend-url';

describe('getBackendApiUrl', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_URL = 'https://backend.example.test/api/';
    delete process.env.NEXT_PUBLIC_API_URL;
    __resetBackendUrlCache();
  });

  it.each(['/courses', 'courses', '/api/courses', '/v1/courses', '/api/v1/courses'])(
    'normalizes %s to one API prefix',
    (path) => {
      expect(getBackendApiUrl(path)).toBe('https://backend.example.test/api/v1/courses');
    },
  );

  it('preserves query strings', () => {
    expect(getBackendApiUrl('/courses?limit=10')).toBe(
      'https://backend.example.test/api/v1/courses?limit=10',
    );
  });
});

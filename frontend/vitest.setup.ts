import { beforeAll } from 'vitest';

// Setup test environment with locale for Arabic tests
beforeAll(() => {
  // Set locale for Arabic formatting tests
  if (typeof Intl !== 'undefined') {
    // Use a locale that supports Arabic numerals and formatting
    // This helps format-utils.test.ts run consistently
    try {
      new Intl.DateTimeFormat('ar-EG');
    } catch {
      console.warn('Arabic locale not supported, some tests may fail');
    }
  }
});
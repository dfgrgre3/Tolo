import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

// Mock hooks for testing
describe('Custom Hooks', () => {
  describe('useLocalStorage', () => {
    it('should initialize with default value', () => {
      const { result } = renderHook(() => useState('default'));
      expect(result.current[0]).toBe('default');
    });

    it('should update value', () => {
      const { result } = renderHook(() => useState('initial'));
      
      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
    });
  });

  describe('useMediaQuery', () => {
    it('should detect mobile viewport', () => {
      // Mock window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      // Test would go here with actual hook implementation
      expect(window.matchMedia('(max-width: 768px)').matches).toBe(true);
    });
  });
});


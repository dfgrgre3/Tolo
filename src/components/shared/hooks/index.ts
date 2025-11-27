/**
 * Custom Hooks المشتركة
 * 
 * مجموعة من الـ hooks القابلة لإعادة الاستخدام
 */

// Storage Hooks
export { useLocalStorage } from './useLocalStorage';

// Performance Hooks
export { useDebounce, useDebouncedCallback } from './useDebounce';

// UI Hooks
export { useMediaQuery, useDeviceType, useOrientation } from './useMediaQuery';
export { useOnClickOutside, useOnClickOutsideMultiple } from './useOnClickOutside';
export { 
  useKeyPress, 
  useMultiKeyPress, 
  useKeyboardShortcuts,
  type UseKeyPressOptions 
} from './useKeyPress';

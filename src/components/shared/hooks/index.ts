/**
 * Custom Hooks المشتركة
 * 
 * مجموعة من الـ hooks القابلة لإعادة الاستخدام
 */

// Storage Hooks
export { useLocalStorage } from '@/hooks/use-local-storage';

// Performance Hooks
export { useDebounce, useDebouncedCallback } from '@/hooks/use-debounce';

// UI Hooks
export { useMediaQuery, useDeviceType, useOrientation } from '@/hooks/use-media-query';
export { useOnClickOutside, useOnClickOutsideMultiple } from '@/hooks/use-on-click-outside';
export { 
  useKeyPress, 
  useMultiKeyPress,
  useKeyboardShortcuts,
  type UseKeyPressOptions
} from '@/hooks/use-key-press';

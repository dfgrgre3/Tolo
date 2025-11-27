/**
 * المكونات المشتركة (Shared Components)
 * 
 * مكونات قابلة لإعادة الاستخدام في جميع أنحاء التطبيق
 */

export { 
  LoadingSpinner, 
  SkeletonLoader, 
  LoadingCard 
} from './LoadingSpinner';
export type { 
  LoadingSpinnerProps, 
  SkeletonLoaderProps, 
  LoadingCardProps 
} from './LoadingSpinner';

export { Alert, AlertContainer } from './Alert';
export type { AlertProps, AlertContainerProps, AlertType } from './Alert';

// Custom Hooks
export {
  useLocalStorage,
  useDebounce,
  useDebouncedCallback,
  useMediaQuery,
  useDeviceType,
  useOrientation,
  useOnClickOutside,
  useOnClickOutsideMultiple,
  useKeyPress,
  useMultiKeyPress,
  useKeyboardShortcuts,
} from './hooks';
export type { UseKeyPressOptions } from './hooks';

// Core hooks used throughout the application
export { useUpload, useFileManager } from "./use-upload";
export type { UseUploadOptions, UseUploadReturn, UseFileManagerOptions, UseFileManagerReturn } from "./use-upload";
export { useGlobalSettings } from "./use-global-settings";
export { useEfficiencyMode } from "./use-efficiency-mode";

// Utility hooks
export { useDebounce, useDebouncedCallback } from "./use-debounce";
export { useOnClickOutside, useOnClickOutsideMultiple } from "./use-on-click-outside";
export { useKeyPress, useMultiKeyPress, useKeyboardShortcuts } from "./use-key-press";
export { useMediaQuery, useDeviceType, useOrientation } from "./use-media-query";
export { useNetworkStatus } from "./use-network-status";
export { useLocalStorage, useLocalStorageValue } from "./use-local-storage";

// Feature-specific hooks
export { useAuth } from "./use-auth";
export { useCourses } from "./use-courses";
export { usePermission } from "./use-permission";
export { useGamification, type CustomGoal } from "./use-gamification";
export { useTimeTrackerStore, type PomodoroState } from "./use-time-tracker-store";
export { useOfflineOutboxStore } from "./use-offline-outbox-store";
export { usePersistedQuery } from "./use-persisted-query";

// UI hooks
export { useStickyHeader } from "./use-sticky-header";
export { useHeaderAnimations } from "./use-header-animations";
export { useHeaderKeyboardShortcuts } from "./use-keyboard-shortcuts";
export { useFormPersistence } from "./use-form-persistence";
export { useAdaptiveDebounce } from "./use-adaptive-debounce";
export { useEfficiency } from "./use-efficiency";
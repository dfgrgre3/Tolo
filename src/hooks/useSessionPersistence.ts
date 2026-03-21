'use client';

import { useScrollPositionPersistence } from './useScrollPositionPersistence';
import { useFormPersistence } from './useFormPersistence';

/**
 * Hook شامل لحفظ حالة الجلسة - يجمع بين حفظ موقع التمرير وبيانات النماذج
 * Comprehensive session persistence hook - combines scroll position and form data persistence
 */
export function useSessionPersistence<T extends Record<string, any>>(
  formId?: string,
  initialFormValues?: T,
  formOptions?: {
    debounceMs?: number;
    excludeFields?: string[];
    includeFields?: string[];
    autoSave?: boolean;
  }
) {
  // حفظ موقع التمرير دائماً
  const scrollPersistence = useScrollPositionPersistence();

  // حفظ بيانات النماذج إذا كان محدد
  const formPersistence = formId && initialFormValues
    ? useFormPersistence(formId, initialFormValues, formOptions)
    : null;

  // No-op functions when form persistence is disabled
  const noop = () => { };
  const noopRestore = () => initialFormValues || {} as T;

  return {
    // Scroll persistence
    saveScrollPosition: scrollPersistence.saveScrollPosition,
    restoreScrollPosition: scrollPersistence.restoreScrollPosition,

    // Form persistence (always defined, but no-ops when disabled)
    saveFormData: formPersistence?.saveFormData ?? noop,
    restoreFormData: formPersistence?.restoreFormData ?? noopRestore,
    clearFormData: formPersistence?.clearFormData ?? noop,
    saveField: formPersistence?.saveField ?? noop,
    restoreField: formPersistence?.restoreField ?? noop,
    isFormInitialized: formPersistence?.isInitialized ?? false
  };
}

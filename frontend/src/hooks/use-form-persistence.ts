"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

export function useFormPersistence<T extends Record<string, any>>(
formId: string,
initialFormValues: T,
_options: {
  debounceMs?: number;
  excludeFields?: string[];
  includeFields?: string[];
  autoSave?: boolean;
} = {})
{
  const storageKey = `form:${formId}`;
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initialFormValues;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) as T : initialFormValues;
    } catch {
      return initialFormValues;
    }
  });

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isInitialized = mounted;

  const saveFormData = useCallback((values: T) => {
    setState(values);
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      return;
    }
  }, [storageKey]);

  const saveField = useCallback((field: keyof T, value: T[keyof T]) => {
    setState((current) => {
      const next = { ...current, [field]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        return next;
      }
      return next;
    });
  }, [storageKey]);

  const restoreFormData = useCallback(() => state, [state]);
  const restoreField = useCallback((field: keyof T) => state[field], [state]);
  const clearFormData = useCallback(() => {
    setState(initialFormValues);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      return;
    }
  }, [initialFormValues, storageKey]);

  return useMemo(() => ({
    saveFormData,
    restoreFormData,
    clearFormData,
    saveField,
    restoreField,
    isInitialized
  }), [clearFormData, isInitialized, restoreField, restoreFormData, saveField, saveFormData]);
}

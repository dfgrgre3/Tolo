"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useFormPersistence<T extends Record<string, any>>(
  formId: string,
  initialFormValues: T,
  options: {
    debounceMs?: number;
    excludeFields?: string[];
    includeFields?: string[];
    autoSave?: boolean;
  } = {}
) {
  const storageKey = `form:${formId}`;
  const [isInitialized, setIsInitialized] = useState(false);
  const [state, setState] = useState<T>(initialFormValues);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setState(JSON.parse(raw) as T);
      }
    } catch {
      setState(initialFormValues);
    } finally {
      setIsInitialized(true);
    }
  }, [initialFormValues, storageKey]);

  const saveFormData = useCallback((values: T) => {
    setState(values);
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {}
  }, [storageKey]);

  const saveField = useCallback((field: keyof T, value: T[keyof T]) => {
    setState((current) => {
      const next = { ...current, [field]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [storageKey]);

  const restoreFormData = useCallback(() => state, [state]);
  const restoreField = useCallback((field: keyof T) => state[field], [state]);
  const clearFormData = useCallback(() => {
    setState(initialFormValues);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [initialFormValues, storageKey]);

  return useMemo(() => ({
    saveFormData,
    restoreFormData,
    clearFormData,
    saveField,
    restoreField,
    isInitialized,
  }), [clearFormData, isInitialized, restoreField, restoreFormData, saveField, saveFormData]);
}

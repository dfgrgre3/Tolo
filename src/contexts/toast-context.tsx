'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, ToastProps } from '../components/ui/Toast';

type ToastContextType = {
  showToast: (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface Toast extends ToastProps {
  id: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn('Invalid toast ID provided for removal');
      return;
    }

    setToasts(prev => prev.filter(toast => toast.id !== id.trim()));
  }, []);

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    // Validate toast input
    if (!toast || typeof toast !== 'object') {
      console.warn('Invalid toast object provided');
      return '';
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      onDismiss: () => removeToast(id),
    };

    // Limit maximum toasts to prevent memory issues
    setToasts(prev => {
      // Check if toast with same ID already exists (prevent duplicates)
      if (prev.some(t => t.id === id)) {
        return prev;
      }

      // Remove oldest toast if we've reached the limit (10 toasts max)
      if (prev.length >= 10) {
        return [...prev.slice(1), newToast];
      }

      return [...prev, newToast];
    });
    
    return id;
  }, [removeToast]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

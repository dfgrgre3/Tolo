'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import ErrorToast, { ErrorToastProps } from './ErrorToast';
import errorManager, { ErrorDisplayOptions } from '../services/ErrorManager';

type ToastCallback = (options: ErrorDisplayOptions & { variant: 'destructive' | 'warning' | 'info' }) => void;

interface ToastContextType {
  showToast: (toast: Omit<ErrorToastProps, 'id' | 'onDismiss'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

interface Toast extends ErrorToastProps {
  id: string;
}

interface ToastProviderProps {
  children: ReactNode;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(
      'useToast must be used within a ToastProvider.\n' +
      'Please wrap your root component with <ToastProvider> in your layout file.'
    );
  }
  return context;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const MAX_TOASTS = 5;

  const showToast = useCallback((toast: Omit<ErrorToastProps, 'id' | 'onDismiss'>) => {
    if (!toast.title && !toast.description) {
      console.warn('Toast must have at least title or description');
      return '';
    }
    
    const id = crypto.randomUUID?.() || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      onDismiss: () => removeToast(id),
    };

    setToasts(prev => [...prev.slice(-(MAX_TOASTS-1)), newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue = useMemo(() => ({
    showToast,
    removeToast,
    clearAllToasts
  }), [showToast, removeToast, clearAllToasts]);

  // Register toast callback with ErrorManager
  useEffect(() => {
    const toastCallback: ToastCallback = (options) => {
      try {
        if (!options) return;
        showToast({
          title: options.title || '',
          description: options.description,
          variant: options.variant,
          duration: options.duration,
          action: options.action
        });
      } catch (error) {
        console.error('Error in toast callback:', error);
      }
    };

    errorManager.registerToastCallback(toastCallback);
    return () => {
      errorManager.registerToastCallback(() => {});
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto animate-fade-in-up">
            <ErrorToast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
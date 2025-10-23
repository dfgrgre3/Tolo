import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import ErrorToast, { ErrorToastProps } from './ErrorToast';
import errorManager from '../services/ErrorManager';

interface ToastContextType {
  showToast: (toast: Omit<ErrorToastProps, 'id' | 'onDismiss'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface Toast extends ErrorToastProps {
  id: string;
}

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<ErrorToastProps, 'id' | 'onDismiss'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      onDismiss: () => removeToast(id),
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Register toast callback with ErrorManager
  useEffect(() => {
    const toastCallback = (options: any) => {
      // Ensure we're still mounted before calling state setters
      if (showToast && typeof showToast === 'function') {
        showToast({
          title: options.title,
          description: options.description,
          variant: options.variant,
          duration: options.duration,
          action: options.action,
        });
      }
    };

    errorManager.registerToastCallback(toastCallback);

    // Cleanup on unmount
    return () => {
      // Unregister the callback when component unmounts
      errorManager.registerToastCallback(null);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, clearAllToasts }}>
      {children}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ErrorToast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
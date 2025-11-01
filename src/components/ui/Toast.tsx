'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastProps = {
  message: string;
  type?: 'success' | 'warning' | 'error';
  onDismiss: () => void;
};

export const Toast = ({ message, type = 'success', onDismiss }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`${bgColor[type]} text-white px-4 py-2 rounded-md shadow-lg flex items-center min-w-[200px]`}
    >
      <span>{message}</span>
      <button 
        onClick={onDismiss}
        className="ml-2 text-white hover:text-gray-200"
      >
        &times;
      </button>
    </motion.div>
  );
};

export type ToastContainerProps = {
  toasts: Array<{ id: string; message: string; type?: 'success' | 'warning' | 'error' }>;
  onDismiss: (id: string) => void;
};

export const ToastContainer = ({ toasts, onDismiss }: ToastContainerProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => onDismiss(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

'use client';

import React, { useEffect, useState } from 'react';

import { ToastProps, ToastContainerProps } from '@/types/toast';

export const Toast = ({ message, type = 'success', onDismiss }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for transition before unmounting
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div
      className={`${bgColor[type]} text-white px-4 py-2 rounded-md shadow-lg flex items-center min-w-[200px] transition-all duration-300 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <span>{message}</span>
      <button 
        onClick={() => {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }}
        className="ml-2 text-white hover:text-gray-200"
      >
        &times;
      </button>
    </div>
  );
};


// ToastContainerProps is now imported from @/types/toast


export const ToastContainer = ({ toasts, onDismiss }: ToastContainerProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
};

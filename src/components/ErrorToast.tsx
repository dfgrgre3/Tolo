import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export interface ErrorToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'success' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({
  id,
  title,
  description,
  variant = 'default',
  duration = 5000,
  action,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Show toast on mount
  useEffect(() => {
    setIsVisible(true);

    // Auto dismiss after duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);

    // Wait for animation to complete
    setTimeout(() => {
      if (onDismiss) {
        onDismiss();
      }
    }, 300);
  };

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div
      className={cn(
        'max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out',
        isVisible && !isLeaving ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        isLeaving && 'translate-y-2 opacity-0'
      )}
    >
      <div className={cn('p-4', getVariantStyles())}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="mr-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
            {action && (
              <div className="mt-3 flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              </div>
            )}
          </div>
          <div className="mr-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={handleDismiss}
            >
              <span className="sr-only">إغلاق</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorToast;

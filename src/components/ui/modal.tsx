"use client";

import { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ isOpen, onClose, title, children, className = "" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        className={`bg-background rounded-lg border p-4 w-full max-w-md ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">{title}</h3>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { MegaMenuProps } from "./types";
import { MegaMenuContent } from "./MegaMenuContent";
import { HeaderMenuTrigger } from "@/components/navigation";

interface MegaMenuComponentProps extends MegaMenuProps {
  label: string;
  className?: string;
  onOpen?: () => void;
}

export function MegaMenu({
  categories,
  isOpen,
  onClose,
  activeRoute,
  label,
  className,
  onOpen,
  user,
}: MegaMenuComponentProps) {
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
      closeTimeoutRef.current = null;
    }, 140);
  }, [clearCloseTimeout, onClose]);

  const handleMouseEnter = useCallback(() => {
    clearCloseTimeout();
    if (onOpen && !isOpen) {
      onOpen();
    }
  }, [clearCloseTimeout, onOpen, isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    clearCloseTimeout();
    if (onOpen && !isOpen) {
      onOpen();
    } else if (isOpen) {
      onClose();
    }
  }, [clearCloseTimeout, onOpen, isOpen, onClose]);

  const handleClick = useCallback(() => {
    clearCloseTimeout();
    if (isOpen) {
      onClose();
    } else if (onOpen) {
      onOpen();
    }
  }, [clearCloseTimeout, isOpen, onClose, onOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  useEffect(() => {
    return () => clearCloseTimeout();
  }, [clearCloseTimeout]);

  return (
    <div className="relative group" ref={megaMenuRef}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={scheduleClose}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleMouseEnter}
        data-mega-menu-trigger
      >
        <HeaderMenuTrigger
          label={label}
          isOpen={isOpen}
          onClick={handleClick}
          className={className}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <div 
            data-mega-menu-content 
            onMouseEnter={clearCloseTimeout} 
            onMouseLeave={scheduleClose}
            onTouchStart={clearCloseTimeout}
          >
            <MegaMenuContent categories={categories} isOpen={isOpen} onClose={onClose} activeRoute={activeRoute} user={user} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

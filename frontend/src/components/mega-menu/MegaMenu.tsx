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

const OPEN_DELAY = 80;
const CLOSE_DELAY = 100;

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
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const clearOpenTimeout = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearOpenTimeout();
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
      closeTimeoutRef.current = null;
    }, CLOSE_DELAY);
  }, [clearCloseTimeout, clearOpenTimeout, onClose]);

  const handleMouseEnter = useCallback(() => {
    clearCloseTimeout();
    clearOpenTimeout();
    if (!isOpen) {
      openTimeoutRef.current = setTimeout(() => {
        onOpen?.();
        openTimeoutRef.current = null;
      }, OPEN_DELAY);
    }
  }, [clearCloseTimeout, clearOpenTimeout, onOpen, isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    clearCloseTimeout();
    clearOpenTimeout();
    if (onOpen && !isOpen) {
      onOpen();
    } else if (isOpen) {
      onClose();
    }
  }, [clearCloseTimeout, clearOpenTimeout, onOpen, isOpen, onClose]);

  const handleClick = useCallback(() => {
    clearCloseTimeout();
    clearOpenTimeout();
    if (isOpen) {
      onClose();
    } else if (onOpen) {
      onOpen();
    }
  }, [clearCloseTimeout, clearOpenTimeout, isOpen, onClose, onOpen]);

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
    return () => {
      clearCloseTimeout();
      clearOpenTimeout();
    };
  }, [clearCloseTimeout, clearOpenTimeout]);

  return (
    <div className="relative group" ref={megaMenuRef}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={scheduleClose}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleMouseEnter}
        onBlur={scheduleClose}
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

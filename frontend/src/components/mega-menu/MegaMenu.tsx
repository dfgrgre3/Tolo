"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { MegaMenuProps } from "./types";
import { MegaMenuContent } from "./MegaMenuContent";
import { HeaderMenuTrigger } from "@/components/navigation";

import { MegaMenuBackdrop } from "./MegaMenuBackdrop";

interface MegaMenuComponentProps extends MegaMenuProps {
  label: string;
  className?: string;
  onOpen?: () => void;
}

const OPEN_DELAY = 120;
const CLOSE_DELAY = 180;

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
      closeTimeoutRef.current = null;
    }, CLOSE_DELAY);
  }, [clearCloseTimeout, onClose]);

  const scheduleOpen = useCallback(() => {
    clearOpenTimeout();
    clearCloseTimeout();
    if (!isOpen && onOpen) {
      openTimeoutRef.current = setTimeout(() => {
        onOpen();
        openTimeoutRef.current = null;
      }, OPEN_DELAY);
    }
  }, [clearCloseTimeout, clearOpenTimeout, onOpen, isOpen]);

  const handleMouseEnter = useCallback(() => {
    clearCloseTimeout();
    if (!isOpen) {
      scheduleOpen();
    }
  }, [clearCloseTimeout, scheduleOpen, isOpen]);

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

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (
      megaMenuRef.current &&
      relatedTarget &&
      relatedTarget instanceof Node &&
      !megaMenuRef.current.contains(relatedTarget)
    ) {
      scheduleClose();
    }
  }, [scheduleClose]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (
      megaMenuRef.current &&
      relatedTarget &&
      relatedTarget instanceof Node &&
      !megaMenuRef.current.contains(relatedTarget)
    ) {
      scheduleClose();
    }
  }, [scheduleClose]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
      clearOpenTimeout();
    };
  }, [clearCloseTimeout, clearOpenTimeout]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when open (client-only to avoid hydration mismatch)
  useEffect(() => {
    if (!isMounted) return;
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return;
  }, [isOpen, isMounted]);

  return (
    <div className="relative group" ref={megaMenuRef}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleMouseEnter}
        onBlur={handleBlur}
        data-mega-menu-trigger
        aria-expanded={isOpen}
        aria-haspopup="dialog"
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
          <>
            <MegaMenuBackdrop onClose={onClose} />
            <m.div
              data-mega-menu-content
              className="relative z-[9999]"
              onMouseEnter={clearCloseTimeout}
              onMouseLeave={handleMouseLeave}
              onTouchStart={clearCloseTimeout}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-label={label}
            >
              <MegaMenuContent categories={categories} isOpen={isOpen} onClose={onClose} activeRoute={activeRoute} user={user} />
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

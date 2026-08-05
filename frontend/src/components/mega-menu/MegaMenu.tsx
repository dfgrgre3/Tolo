"use client";

import React, { useRef, useCallback, useEffect, useId } from "react";
import { MegaMenuProps } from "./types";
import { MegaMenuContent } from "./MegaMenuContent";
import { HeaderMenuTrigger } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

// ==========================================
// Types
// ==========================================

interface MegaMenuComponentProps extends MegaMenuProps {
  label: string;
  className?: string;
  onOpen?: () => void;
  /** z-index للقائمة والخلفية - يمرر من Parent. افتراضي 50 ليتوافق مع z-50 في tailwind */
  zIndex?: number;
  enableTracking?: boolean;
}

const OPEN_DELAY = 120;
const CLOSE_DELAY = 180;
const DEFAULT_Z_INDEX = 50;

// ==========================================
// SSR-Safe Scroll Lock Store
// ==========================================

type Listener = () => void;
let scrollLockCount = 0;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function incrementScrollLock() {
  scrollLockCount++;
  if (scrollLockCount === 1) document.body.style.overflow = "hidden";
  listeners.forEach((l) => l());
}

function decrementScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = "";
  listeners.forEach((l) => l());
}

// ==========================================
// Focus Trap Hook
// ==========================================

function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl?.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl?.focus();
      }
    };

    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive, containerRef]);
}

// ==========================================
// Tracking Utility
// ==========================================

function trackMegaMenuEvent(eventType: "open" | "close", label: string, metadata?: Record<string, unknown>) {
  const payload = JSON.stringify({
    type: eventType,
    component: "mega_menu",
    label,
    timestamp: Date.now(),
    ...metadata,
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/analytics/mega-menu", payload);
    if (!sent) {
      fetch("/api/analytics/mega-menu", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch((e) => logger.debug("MegaMenu fallback track failed:", e));
    }
  } else {
    fetch("/api/analytics/mega-menu", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch((e) => logger.debug("MegaMenu fallback track failed:", e));
  }
}

// ==========================================
// Unified Component
// ==========================================

export function MegaMenu({
  categories,
  isOpen,
  onClose,
  activeRoute,
  label,
  className,
  onOpen,
  user,
  zIndex,
  enableTracking = true,
}: MegaMenuComponentProps) {
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const hasTrackedOpenRef = useRef(false);

  // Guard against undefined/NaN zIndex to prevent invalid CSS values
  const safeZIndex = Number.isFinite(zIndex) ? (zIndex as number) : DEFAULT_Z_INDEX;

  useFocusTrap(contentRef, isOpen);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleAction = useCallback(
    (action: () => void, delay: number) => {
      clearTimeouts();
      timeoutRef.current = setTimeout(() => {
        action();
        timeoutRef.current = null;
      }, delay);
    },
    [clearTimeouts]
  );

  // تتبع الفتح
  useEffect(() => {
    if (isOpen && enableTracking && !hasTrackedOpenRef.current) {
      trackMegaMenuEvent("open", label);
      hasTrackedOpenRef.current = true;
    }
    if (!isOpen) hasTrackedOpenRef.current = false;
  }, [isOpen, enableTracking, label]);

  const handleToggle = useCallback(() => {
    clearTimeouts();
    if (isOpen) {
      if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "toggle" });
      onClose();
    } else {
      onOpen?.();
    }
  }, [clearTimeouts, isOpen, onClose, onOpen, enableTracking, label]);

  const handleMouseEnter = useCallback(() => {
    clearTimeouts();
    if (!isOpen && onOpen) scheduleAction(onOpen, OPEN_DELAY);
  }, [clearTimeouts, isOpen, onOpen, scheduleAction]);

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (megaMenuRef.current && relatedTarget instanceof Node && !megaMenuRef.current.contains(relatedTarget)) {
        scheduleAction(() => {
          if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "mouse_leave" });
          onClose();
        }, CLOSE_DELAY);
      }
    },
    [scheduleAction, onClose, enableTracking, label]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const handleFocus = useCallback(() => {
    clearTimeouts();
    if (!isOpen && onOpen) onOpen();
  }, [clearTimeouts, isOpen, onOpen]);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (megaMenuRef.current && relatedTarget instanceof Node && !megaMenuRef.current.contains(relatedTarget)) {
        scheduleAction(onClose, CLOSE_DELAY);
      }
    },
    [scheduleAction, onClose]
  );

  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "escape" });
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, enableTracking, label]);

  useEffect(() => {
    if (!isOpen) return;
    incrementScrollLock();
    return () => decrementScrollLock();
  }, [isOpen]);

  return (
    <div className="relative group" ref={megaMenuRef}>
      {/* Trigger */}
      <div
        data-mega-menu-trigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleToggle}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={menuId}
      >
        <HeaderMenuTrigger label={label} isOpen={isOpen} onClick={handleToggle} className={className} />
      </div>

      {/* ✅ Backdrop مدمج - دائماً في DOM، animation حقيقية، z-index متزامن */}
      <div
        data-mega-menu-backdrop
        className={cn(
          "fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm",
          "transition-opacity duration-200 ease-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ zIndex: safeZIndex - 1 }}
        onClick={() => {
          if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "backdrop" });
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Content */}
      {isOpen && (
        <div
          id={menuId}
          ref={contentRef}
          data-mega-menu-content
          role="dialog"
          aria-modal="true"
          aria-label={label}
          style={{ zIndex: safeZIndex }}
          className="relative transition-opacity duration-150 ease-out opacity-100"
          onMouseEnter={clearTimeouts}
          onMouseLeave={handleMouseLeave}
          onTouchStart={clearTimeouts}
        >
          <MegaMenuContent
            categories={categories}
            isOpen={isOpen}
            onClose={onClose}
            activeRoute={activeRoute}
            user={user}
          />
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useRef, useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
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
  badge?: string;
  className?: string;
  onOpen?: () => void;
  /** z-index للقائمة والخلفية - يمرر من Parent. افتراضي 50 ليتوافق مع z-50 في tailwind */
  zIndex?: number;
  enableTracking?: boolean;
}

const DEFAULT_Z_INDEX = 50;

/** مهلة قصيرة قبل الإغلاق تسمح للمؤشر بالانتقال من الـ Trigger إلى القائمة دون إغلاقها */
const CLOSE_DELAY_MS = 150;

// ==========================================
// Scroll Lock – intentionally removed
// ==========================================
// الـ Mega Menu هو Dropdown/Navigation وليس Modal/Drawer.
// لا يحتاج إلى تعطيل التمرير. إزالة Scroll Lock تمنع:
//   1. اختفاء scrollbar
//   2. Layout Shift الناتج عن تغير عرض viewport
//   3. Horizontal Shift في الـ Header ومحتوى الصفحة
// المستخدم يجب أن يستطيع التمرير أثناء فتح الـ Mega Menu.

// ==========================================
// Focus Trap Hook
// ==========================================

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
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const hasTrackedOpenRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [, setAnchorTopPx] = useState<number | null>(null);
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => setIsMounted(true));
  }, []);
  const updateLayout = useCallback(() => {
    if (typeof window === "undefined") return;
    const cssBottom = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-bottom"));
    const triggerBottom = megaMenuRef.current?.getBoundingClientRect().bottom ?? 64;
    const nextTop = Number.isFinite(cssBottom) && cssBottom > 0 ? cssBottom : triggerBottom;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    setAnchorTopPx(Math.round(nextTop));
    setMenuMaxHeight(Math.max(160, Math.floor(viewportHeight - nextTop - 16)));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        setAnchorTopPx(null);
        setMenuMaxHeight(null);
      });
      return;
    }
    updateLayout();
    const viewport = window.visualViewport;
    const headerElement = megaMenuRef.current?.closest("header");
    const resizeObserver = headerElement && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateLayout) : null;

    if (headerElement) resizeObserver?.observe(headerElement);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, { passive: true });
    viewport?.addEventListener("resize", updateLayout);
    viewport?.addEventListener("scroll", updateLayout);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout);
      viewport?.removeEventListener("resize", updateLayout);
      viewport?.removeEventListener("scroll", updateLayout);
    };
  }, [isOpen, updateLayout]);
 // Guard against undefined/NaN zIndex to prevent invalid CSS values
  const safeZIndex = Number.isFinite(zIndex) ? (zIndex as number) : DEFAULT_Z_INDEX;

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const runAction = useCallback(
    (action: () => void) => {
      clearTimeouts();
      action();
    },
    [clearTimeouts]
  );

  /** إغلاق مؤجل: يمنح المؤشر وقتاً للانتقال بين الـ Trigger والقائمة فلا تبتعد القائمة عند تحريك الماوس */
  const scheduleClose = useCallback(
    (trigger: string) => {
      clearTimeouts();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (enableTracking) trackMegaMenuEvent("close", label, { trigger });
        onClose();
      }, CLOSE_DELAY_MS);
    },
    [clearTimeouts, enableTracking, label, onClose]
  );

  /** هل العنصر المستهدف داخل الـ Trigger أو داخل محتوى القائمة (المنقول عبر Portal)؟ */
  const isInsideMenu = useCallback((node: Node | null) => {
    if (!(node instanceof Node)) return false;
    return Boolean(megaMenuRef.current?.contains(node) || contentRef.current?.contains(node));
  }, []);

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
    if (!isOpen && onOpen) runAction(onOpen);
  }, [clearTimeouts, isOpen, onOpen, runAction]);

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (!isInsideMenu(e.relatedTarget as Node | null)) {
        scheduleClose("mouse_leave");
      }
    },
    [isInsideMenu, scheduleClose]
  );

  const handleFocus = useCallback(() => {
    clearTimeouts();
    if (!isOpen && onOpen) onOpen();
  }, [clearTimeouts, isOpen, onOpen]);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!isInsideMenu(e.relatedTarget as Node | null)) {
        runAction(onClose);
      }
    },
    [isInsideMenu, runAction, onClose]
  );

  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "escape" });
        onClose();
        // إعادة التركيز إلى الزر الذي فتح القائمة بدل تركه يضيع في الصفحة
        triggerButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, enableTracking, label]);

  // Scroll Lock intentionally removed – MegaMenu is a dropdown, not a modal.
  // User should be able to scroll the page while MegaMenu is open.

  // الحافة السفلية للـ Header — تُحدَّث من Header.tsx.
  // نستخدمها عبر Portal على body لتفادي أن يصبح الـ Header (بسبب backdrop-blur)
  // هو الـ containing block لعناصر position: fixed، وهو ما كان يسبب الإزاحة/الفراغ.
  const anchorTop = "var(--header-bottom, var(--header-height, 64px))";

  const overlay = (
    <>
      {/* Backdrop — يبدأ من الحافة السفلية للـ Header فلا يغطيه ولا يتداخل معه */}
      <div
        data-mega-menu-backdrop
        className={cn(
          "fixed left-0 right-0 bottom-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm",
          isOpen ? "opacity-100 pointer-events-auto" : "hidden"
        )}
        style={{ zIndex: safeZIndex - 1, top: anchorTop }}
        onClick={() => {
          if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "backdrop" });
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Content — ملاصق تماماً أسفل الـ Header بدون أي فراغ */}
      {isOpen && (
        <div
          id={menuId}
          ref={contentRef}
          data-mega-menu-content
          role="region"
          aria-label={label}
          className="fixed left-0 right-0"
          style={{ zIndex: safeZIndex, top: anchorTop, maxHeight: menuMaxHeight ? `${menuMaxHeight}px` : undefined, overflowY: "auto" }}
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
    </>
  );

  return (
    <div className="relative group" ref={megaMenuRef}>
      {/* Trigger */}
      <div
        data-mega-menu-trigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}

      >
        <HeaderMenuTrigger ref={triggerButtonRef} label={label} isOpen={isOpen} onClick={handleToggle} ariaControls={menuId} className={className} />
      </div>

      {isMounted && createPortal(overlay, document.body)}
    </div>
  );
}

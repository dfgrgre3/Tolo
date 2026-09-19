"use client";

import React, { useRef, useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { MegaMenuProps } from "./types";
import { MegaMenuContent } from "./MegaMenuContent";
import { HeaderMenuTrigger } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { apiClient } from "@/lib/api/api-client";
import { repairMojibake } from "@/lib/i18n/repair-mojibake";

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
  direction?: "ltr" | "rtl";
}

const DEFAULT_Z_INDEX = 50;

/** مهلة قصيرة قبل الإغلاق تسمح للمؤشر بالانتقال من الـ Trigger إلى القائمة دون إغلاقها */
const CLOSE_DELAY_MS = 120;

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

  if (typeof navigator.sendBeacon === "function") {
    // sendBeacon defaults to text/plain for a string body. The backend uses
    // JSON binding, so explicitly send an application/json Blob; otherwise
    // the event may be accepted by the proxy but rejected by the handler.
    const body = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon("/api/analytics/mega-menu", body);
    if (!sent) {
      void apiClient.postJson<unknown>("/analytics/mega-menu", JSON.parse(payload), { timeout: 1500, retries: 0 }).catch((e) => logger.debug("MegaMenu fallback track failed:", e));
    }
  } else {
    void apiClient.postJson<unknown>("/analytics/mega-menu", JSON.parse(payload), { timeout: 1500, retries: 0 }).catch((e) => logger.debug("MegaMenu fallback track failed:", e));
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
  icon,
  badge,
  className,
  onOpen,
  direction = "rtl",
  zIndex,
  enableTracking = true,
}: MegaMenuComponentProps) {
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const hasTrackedOpenRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  /** يبقى المحتوى في الـ DOM أثناء أنيميشن الإغلاق ثم يُزال بعدها */
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CLOSE_ANIMATION_MS = 120;

  /**
   * The portal container is inserted immediately AFTER the <header> element
   * rather than appended to document.body. Visual order and DOM order then
   * agree, so keyboard focus flows trigger → menu → page content; portaling to
   * the end of <body> would strand keyboard users, forcing them to Tab through
   * the whole page to reach the open menu.
   */
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => setIsMounted(true));
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const header = document.querySelector<HTMLElement>("[data-header-root]");
    if (!header || !header.parentElement) return;

    let container = portalContainerRef.current;
    if (!container) {
      container = document.createElement("div");
      container.dataset.megaMenuPortal = "true";
      portalContainerRef.current = container;
    }
    if (container.parentElement !== header.parentElement) {
      header.parentElement.insertBefore(container, header.nextSibling);
    }
    setPortalTarget(container);

    return () => {
      const node = portalContainerRef.current;
      if (node?.parentElement) node.parentElement.removeChild(node);
    };
  }, [isMounted]);

  useEffect(() => {
    if (isOpen) {
      if (closeAnimationRef.current) {
        clearTimeout(closeAnimationRef.current);
        closeAnimationRef.current = null;
      }
      // Gated by isOpen transition (not every render), needed to mount content
      // before the open animation frame runs; does not cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRendered(true);
      // إطار إضافي لضمان تطبيق حالة "مغلق" أولاً قبل الانتقال إلى "مفتوح"
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    closeAnimationRef.current = setTimeout(() => {
      setIsRendered(false);
      closeAnimationRef.current = null;
    }, CLOSE_ANIMATION_MS);
    return () => {
      if (closeAnimationRef.current) {
        clearTimeout(closeAnimationRef.current);
        closeAnimationRef.current = null;
      }
    };
  }, [isOpen]);
  // Position and available height are derived from the Header CSS variables and
  // the single scroll container in MegaMenuContainer. Keep this component out
  // of the layout-measurement loop while the menu is open.
  const safeZIndex = Number.isFinite(zIndex)
    ? Math.max(1, Math.floor(zIndex as number))
    : DEFAULT_Z_INDEX;

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
    return Boolean(megaMenuRef.current?.contains(node) || document.querySelector(`[data-mega-menu-content][id="${menuId}"]`)?.contains(node));
  }, [menuId]);

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
      if (e.key === "Escape" && isInsideMenu(e.target as Node | null)) {
        if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "escape" });
        onClose();
        // إعادة التركيز إلى الزر الذي فتح القائمة بدل تركه يضيع في الصفحة
        triggerButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, enableTracking, label, isInsideMenu]);

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
          "fixed left-0 right-0 bottom-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-100 ease-out",
          isRendered ? (isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none") : "hidden"
        )}
        style={{ zIndex: safeZIndex - 1, top: anchorTop }}
        onClick={() => {
          if (enableTracking) trackMegaMenuEvent("close", label, { trigger: "backdrop" });
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Content — ملاصق تماماً أسفل الـ Header بدون أي فراغ، بأنيميشن فتح/غلق سلس */}
      {isRendered && (
        <div
          id={menuId}
          data-mega-menu-content
          role="navigation"
          aria-label={repairMojibake(label)}
          dir={direction}
          className={cn(
            "fixed left-0 right-0 transition-[opacity,transform] duration-100 ease-out will-change-transform",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          )}
          style={{ zIndex: safeZIndex, top: anchorTop }}
          onMouseEnter={clearTimeouts}
          onMouseLeave={handleMouseLeave}
          onTouchStart={clearTimeouts}
        >
          <MegaMenuContent
            categories={categories}
            onClose={onClose}
            activeRoute={activeRoute}
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
        <HeaderMenuTrigger ref={triggerButtonRef} label={repairMojibake(label)} icon={icon} isOpen={isOpen} onClick={handleToggle} ariaControls={menuId} badge={badge} className={className} />
      </div>

      {isMounted && portalTarget && createPortal(overlay, portalTarget)}
    </div>
  );
}

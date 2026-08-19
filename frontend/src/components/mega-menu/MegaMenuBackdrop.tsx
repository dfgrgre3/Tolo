"use client";

import { cn } from "@/lib/utils";

interface MegaMenuBackdropProps {
  onClose: () => void;
  /** 
   * z-index للخلفية - يجب أن يكون أقل من z-index القائمة نفسها.
   * يمرر من الـ Orchestrator لضمان التزامن. لا قيمة افتراضية لتجنب التعارض.
   */
  zIndex: number;
  /** حالة الفتح الحقيقية للتحكم في الـ animation عبر CSS */
  isOpen: boolean;
}

export function MegaMenuBackdrop({ onClose, zIndex, isOpen }: MegaMenuBackdropProps) {
  return (
    <div
      data-mega-menu-backdrop
      className={cn(
        "fixed left-0 right-0 bottom-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm",
        isOpen ? "opacity-100 pointer-events-auto" : "hidden"
      )}
      style={{ zIndex, top: "var(--header-bottom, var(--header-height, 64px))" }}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}
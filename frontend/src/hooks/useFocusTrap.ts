// useFocusTrap.ts
import { useEffect, useRef } from "react";

export function useFocusTrap(isActive: boolean) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // حفظ العنصر المركّز سابقاً
    previousFocus.current = document.activeElement as HTMLElement;

    // البحث عن أول عنصر قابل للتركيز داخل الحوار
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const firstFocusable = document.querySelector(`[data-mega-menu-content] ${focusableSelectors}`) as HTMLElement;
    firstFocusable?.focus();

    // منع الخروج بـ Tab
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      const container = document.querySelector('[data-mega-menu-content]');
      if (!container) return;

      const focusables = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      // إعادة التركيز عند الإغلاق
      previousFocus.current?.focus();
    };
  }, [isActive]);
}
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

type DialogFocusOptions = {
  /**
   * True modal dialogs (help, stats, interactive question) trap Tab inside
   * while open. Non-modal surfaces (settings popover, sidebar) only take
   * initial focus + restore on close — trapping a docked sidebar would break
   * keyboard access to the player itself.
   */
  trap?: boolean;
};

/**
 * Dialog focus management (P2-27): initial focus on open, optional Tab trap,
 * and previous-focus restore on close. Mount-safe (no-ops on the server).
 */
export function useDialogFocus(
  containerRef: { current: HTMLElement | null },
  open: boolean,
  options: DialogFocusOptions = {}
) {
  const { trap = false } = options;
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return;

    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Initial focus: first focusable, else the container itself (it must be
    // focusable — callers add tabIndex={-1}).
    const targets = focusablesIn(container);
    (targets[0] ?? container).focus({ preventScroll: true });

    if (!trap) {
      return () => {
        restoreRef.current?.focus({ preventScroll: true });
        restoreRef.current = null;
      };
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const current = focusablesIn(container);
      if (current.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = current[0]!;
      const last = current[current.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreRef.current?.focus({ preventScroll: true });
      restoreRef.current = null;
    };
  }, [containerRef, open, trap]);
}

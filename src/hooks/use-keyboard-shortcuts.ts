"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseKeyboardShortcutsOptions {
    mounted: boolean;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export type KeyboardShortcut = {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
};

// Hook for admin keyboard shortcuts
export function useAdminKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea (unless it's a shortcut with modifier)
            const target = e.target as HTMLElement;
            const isTyping =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            for (const shortcut of shortcuts) {
                const matchesKey = e.key.toLowerCase() === shortcut.key.toLowerCase();
                const matchesCtrl = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
                const matchesShift = !!shortcut.shift === e.shiftKey;
                const matchesAlt = !!shortcut.alt === e.altKey;

                // Allow shortcuts with modifiers even when typing
                const allowInInput = shortcut.ctrl || shortcut.meta || shortcut.alt;

                if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
                    if (isTyping && !allowInInput) continue;

                    e.preventDefault();
                    shortcut.action();
                    break;
                }
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}

// Hook for header keyboard shortcuts
export function useHeaderKeyboardShortcuts({
    mounted,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
}: UseKeyboardShortcutsOptions) {
    const router = useRouter();

    useEffect(() => {
        if (!mounted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                // But allow shortcuts with Ctrl/Cmd
                if (!e.ctrlKey && !e.metaKey) return;
            }

            // Ctrl/Cmd + K for search (global)
            if ((e.ctrlKey || e.metaKey) && e.key === "k" && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                const searchButton = document.querySelector('[data-search-trigger]') as HTMLElement;
                if (searchButton) {
                    searchButton.click();
                }
            }

            // Ctrl/Cmd + / for quick command palette
            if ((e.ctrlKey || e.metaKey) && e.key === "/" && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                // Open command palette
                const event = new CustomEvent("open-command-palette");
                window.dispatchEvent(event);
            }

            // Escape to close mobile menu
            if (e.key === "Escape" && isMobileMenuOpen) {
                e.preventDefault();
                setIsMobileMenuOpen(false);
            }

            // Alt + M for mobile menu toggle
            if (e.altKey && e.key === "m" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                setIsMobileMenuOpen((prev) => !prev);
            }

            // Navigation shortcuts
            // Alt + 1-9 for sidebar navigation
            if (e.altKey && e.key >= "1" && e.key <= "9") {
                e.preventDefault();
                const index = parseInt(e.key) - 1;
                const navLinks = document.querySelectorAll('[data-nav-item]');
                if (navLinks[index]) {
                    (navLinks[index] as HTMLElement).click();
                }
            }

            // Ctrl/Cmd + B for sidebar toggle
            if ((e.ctrlKey || e.metaKey) && e.key === "b" && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                const sidebarToggle = document.querySelector('[data-sidebar-toggle]') as HTMLElement;
                if (sidebarToggle) {
                    sidebarToggle.click();
                }
            }

            // Ctrl/Cmd + Shift + F for advanced search
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "f") {
                e.preventDefault();
                router.push("/admin/search");
            }

            // Ctrl/Cmd + H for home/dashboard
            if ((e.ctrlKey || e.metaKey) && e.key === "h" && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                router.push("/admin");
            }

            // Ctrl/Cmd + Shift + ? for help/shortcuts
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "?") {
                e.preventDefault();
                const event = new CustomEvent("show-keyboard-shortcuts");
                window.dispatchEvent(event);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [mounted, isMobileMenuOpen, setIsMobileMenuOpen, router]);
}

// Hook for touch gestures (mobile)
export function useTouchGestures({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
}: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number;
}) {
    const touchStart = { x: 0, y: 0 };

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStart.x = e.touches[0].clientX;
            touchStart.y = e.touches[0].clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const dx = e.changedTouches[0].clientX - touchStart.x;
            const dy = e.changedTouches[0].clientY - touchStart.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                if (Math.abs(dx) > threshold) {
                    if (dx > 0) {
                        onSwipeRight?.();
                    } else {
                        onSwipeLeft?.();
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(dy) > threshold) {
                    if (dy > 0) {
                        onSwipeDown?.();
                    } else {
                        onSwipeUp?.();
                    }
                }
            }
        };

        document.addEventListener("touchstart", handleTouchStart);
        document.addEventListener("touchend", handleTouchEnd);

        return () => {
            document.removeEventListener("touchstart", handleTouchStart);
            document.removeEventListener("touchend", handleTouchEnd);
        };
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);
}

// Default admin shortcuts
export const defaultAdminShortcuts: KeyboardShortcut[] = [
    {
        key: "k",
        ctrl: true,
        description: "فتح البحث السريع",
        action: () => {
            const event = new CustomEvent("open-search");
            window.dispatchEvent(event);
        },
    },
    {
        key: "/",
        ctrl: true,
        description: "فتح لوحة الأوامر",
        action: () => {
            const event = new CustomEvent("open-command-palette");
            window.dispatchEvent(event);
        },
    },
    {
        key: "b",
        ctrl: true,
        description: "تبديل الشريط الجانبي",
        action: () => {
            const toggle = document.querySelector('[data-sidebar-toggle]') as HTMLElement;
            toggle?.click();
        },
    },
    {
        key: "h",
        ctrl: true,
        description: "الذهاب للرئيسية",
        action: () => {
            window.location.href = "/admin";
        },
    },
    {
        key: "?",
        ctrl: true,
        shift: true,
        description: "عرض اختصارات لوحة المفاتيح",
        action: () => {
            const event = new CustomEvent("show-keyboard-shortcuts");
            window.dispatchEvent(event);
        },
    },
];

// Hook for sidebar keyboard shortcuts
export function useSidebarKeyboardShortcuts(
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            // Arrow key navigation
            if (isOpen) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const items = document.querySelectorAll('[data-sidebar-item]');
                    const current = document.activeElement;
                    const currentIndex = Array.from(items).indexOf(current as Element);

                    let nextIndex: number;
                    if (e.key === "ArrowDown") {
                        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                    } else {
                        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                    }

                    (items[nextIndex] as HTMLElement)?.focus();
                }

                // Enter to activate
                if (e.key === "Enter") {
                    const current = document.activeElement as HTMLElement;
                    if (current?.hasAttribute("data-sidebar-item")) {
                        current.click();
                    }
                }

                // Escape to close
                if (e.key === "Escape") {
                    e.preventDefault();
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, setIsOpen]);
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface StickyHeaderState {
    isScrolled: boolean;
    isShrunk: boolean;
    isHidden: boolean;
    scrollY: number;
    scrollDirection: "up" | "down" | null;
    scrollProgress: number;
}

export interface UseStickyHeaderOptions {
    shrinkThreshold?: number;
    hideThreshold?: number;
    showOnScrollUp?: boolean;
    enableProgress?: boolean;
    debounceMs?: number;
}

const defaultOptions: UseStickyHeaderOptions = {
    shrinkThreshold: 50,
    hideThreshold: 200,
    showOnScrollUp: true,
    enableProgress: true,
    debounceMs: 10,
};

export function useStickyHeader(options: UseStickyHeaderOptions = {}) {
    const opts = { ...defaultOptions, ...options };

    const [state, setState] = useState<StickyHeaderState>({
        isScrolled: false,
        isShrunk: false,
        isHidden: false,
        scrollY: 0,
        scrollDirection: null,
        scrollProgress: 0,
    });

    const lastScrollY = useRef(0);
    const ticking = useRef(false);
    const frameId = useRef<number | null>(null);

    const calculateProgress = useCallback(() => {
        if (typeof document === "undefined") return 0;

        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const scrollableHeight = docHeight - winHeight;

        if (scrollableHeight <= 0) return 0;
        return Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100));
    }, []);

    const updateState = useCallback(() => {
        if (typeof window === "undefined") return;

        const currentScrollY = window.scrollY;
        const scrollDirection = currentScrollY > lastScrollY.current ? "down" : "up";
        const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);

        // Only update if scroll delta is significant or we're at the top
        if (scrollDelta < 5 && currentScrollY !== 0) {
            ticking.current = false;
            return;
        }

        const isScrolled = currentScrollY > 10;
        const isShrunk = currentScrollY > (opts.shrinkThreshold || 50);

        let isHidden = false;
        if (opts.showOnScrollUp) {
            // Hide when scrolling down past threshold, show when scrolling up
            if (scrollDirection === "down" && currentScrollY > (opts.hideThreshold || 200)) {
                isHidden = true;
            } else if (scrollDirection === "up") {
                isHidden = false;
            }
        }

        const scrollProgress = opts.enableProgress ? calculateProgress() : 0;

        // Optimization: Only update state if values have changed significantly
        setState(prev => {
            if (
                prev.isScrolled === isScrolled &&
                prev.isShrunk === isShrunk &&
                prev.isHidden === isHidden &&
                Math.abs(prev.scrollY - currentScrollY) < 10 &&
                prev.scrollDirection === scrollDirection &&
                Math.abs(prev.scrollProgress - scrollProgress) < 1
            ) {
                return prev;
            }
            return {
                isScrolled,
                isShrunk,
                isHidden,
                scrollY: currentScrollY,
                scrollDirection,
                scrollProgress,
            };
        });

        lastScrollY.current = currentScrollY;
        ticking.current = false;
    }, [opts.shrinkThreshold, opts.hideThreshold, opts.showOnScrollUp, opts.enableProgress, calculateProgress]);

    const handleScroll = useCallback(() => {
        if (!ticking.current) {
            if (frameId.current) {
                cancelAnimationFrame(frameId.current);
            }
            frameId.current = requestAnimationFrame(updateState);
            ticking.current = true;
        }
    }, [updateState]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Initial calculation
        updateState();

        // Add scroll listener with passive option for better performance
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (frameId.current) {
                cancelAnimationFrame(frameId.current);
            }
        };
    }, [handleScroll, updateState]);

    // CSS classes based on state
    const headerClasses = {
        base: "sticky top-0 z-50 w-full transition-all duration-300 ease-out",
        scrolled: state.isScrolled ? "backdrop-blur-xl bg-background/80 border-b border-border/50" : "bg-transparent",
        shrunk: state.isShrunk ? "py-2" : "py-4",
        hidden: state.isHidden ? "-translate-y-full" : "translate-y-0",
        shadow: state.isScrolled ? "shadow-lg shadow-black/5 dark:shadow-black/20" : "",
    };

    return {
        ...state,
        headerClasses,
    };
}

export default useStickyHeader;

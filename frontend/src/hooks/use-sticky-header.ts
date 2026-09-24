"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface StickyHeaderState {
    isScrolled: boolean;
    isShrunk: boolean;
    isHidden: boolean;
    scrollY: number;
    scrollDirection: "up" | "down" | null;
    scrollProgress: number;
}

interface UseStickyHeaderOptions {
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

    const docMetricsRef = useRef({ scrollableHeight: 0 });

    /**
     * scrollY / scrollProgress / scrollDirection change on (almost) every
     * scroll frame, so they must NEVER trigger a React re-render on their own.
     * They are snapshotted into state only when one of the boolean thresholds
     * (isScrolled / isShrunk / isHidden) actually flips.
     *
     * Background: Header.tsx consumes only the booleans. Previously scrollY /
     * scrollProgress lived in state and the "did it change?" guard used a 10px
     * delta, so continuous scrolling re-rendered the entire Header subtree
     * roughly every 10px — wasted work for values nobody read.
     */
    const hiddenRef = useRef(false);

    const updateMetrics = useCallback(() => {
        if (typeof document === "undefined") return;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        docMetricsRef.current.scrollableHeight = docHeight - winHeight;
    }, []);

    const calculateProgress = useCallback((currentScrollY: number) => {
        const scrollableHeight = docMetricsRef.current.scrollableHeight;
        if (scrollableHeight <= 0) return 0;
        return Math.min(100, Math.max(0, (currentScrollY / scrollableHeight) * 100));
    }, []);

    const lastScrollY = useRef(0);
    const ticking = useRef(false);
    const frameId = useRef<number | null>(null);

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
            } else {
                // Direction unchanged (shouldn't happen past the delta guard) —
                // keep the previous visibility instead of snapping back.
                isHidden = hiddenRef.current;
            }
        }
        hiddenRef.current = isHidden;

        const scrollProgress = opts.enableProgress ? calculateProgress(currentScrollY) : 0;

        // Optimization: only update state (i.e. re-render subscribers) when a
        // boolean threshold flips. scrollY / scrollProgress / scrollDirection
        // ride along as a snapshot but never cause an update on their own.
        setState(prev => {
            if (
                prev.isScrolled === isScrolled &&
                prev.isShrunk === isShrunk &&
                prev.isHidden === isHidden
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

        // Initial calculation & metrics update
        updateMetrics();
        updateState();

        // Add scroll & resize listeners with passive option for better performance
        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", updateMetrics, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", updateMetrics);
            if (frameId.current) {
                cancelAnimationFrame(frameId.current);
            }
        };
    }, [handleScroll, updateMetrics, updateState]);

    // CSS classes based on state - NO transitions for instant, smooth feel
    const headerClasses = {
        base: "sticky top-0 z-50 w-full",
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



"use client";

import { useCallback, useMemo } from "react";

// Optimized animation presets for smooth header animations
const headerAnimations = {
    // Smooth enter/exit for dropdowns
    dropdown: {
        initial: { opacity: 0, y: -8, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.96 },
        transition: {
            type: "spring" as const,
            stiffness: 400,
            damping: 30,
            mass: 0.8,
        },
    },

    // Mobile menu slide
    mobileMenu: {
        initial: { x: "100%", opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: "100%", opacity: 0 },
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 30,
            mass: 0.8,
        },
    },

    // Overlay fade
    overlay: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2, ease: "easeOut" as const },
    },

    // Subtle scale for buttons
    buttonHover: {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: {
            type: "spring" as const,
            stiffness: 500,
            damping: 30,
        },
    },

    // Icon rotation
    iconRotate: {
        initial: { rotate: 0 },
        animate: (isOpen: boolean) => ({ rotate: isOpen ? 180 : 0 }),
        transition: {
            type: "spring" as const,
            stiffness: 400,
            damping: 25,
        },
    },

    // Stagger children animations
    staggerContainer: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1,
            },
        },
    },

    staggerItem: {
        hidden: { opacity: 0, x: 20 },
        show: {
            opacity: 1,
            x: 0,
            transition: {
                type: "spring" as const,
                stiffness: 400,
                damping: 25,
            },
        },
    },

    // Header shrink animation
    headerShrink: {
        normal: {
            height: "4rem",
            padding: "1rem",
            boxShadow: "none",
        },
        shrunk: {
            height: "3rem",
            padding: "0.5rem 1rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        },
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 30,
        },
    },

    // Progress bar
    progressBar: {
        initial: { scaleX: 0, transformOrigin: "left" },
        animate: (progress: number) => ({
            scaleX: progress / 100,
            transition: {
                type: "spring" as const,
                stiffness: 100,
                damping: 20,
            },
        }),
    },

    // Badge pulse
    badgePulse: {
        animate: {
            scale: [1, 1.1, 1],
            opacity: [1, 0.8, 1],
        },
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut" as const,
        },
    },

    // Notification bell shake
    bellShake: {
        animate: {
            rotate: [0, 15, -15, 10, -10, 5, -5, 0],
        },
        transition: {
            duration: 0.6,
            ease: "easeInOut" as const,
        },
    },
};

// Custom hook for managing header animations
export function useHeaderAnimations() {
    // Memoized animation variants for performance
    const dropdownVariants = useMemo(() => headerAnimations.dropdown, []);
    const mobileMenuVariants = useMemo(() => headerAnimations.mobileMenu, []);
    const overlayVariants = useMemo(() => headerAnimations.overlay, []);

    // Get animation props for a specific animation type
    const getAnimationProps = useCallback(
        (type: keyof typeof headerAnimations) => {
            return headerAnimations[type];
        },
        []
    );

    // Create custom stagger animation
    const createStaggerAnimation = useCallback(
        (staggerDelay: number = 0.05, initialDelay: number = 0.1) => ({
            container: {
                hidden: { opacity: 0 },
                show: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren: initialDelay,
                    },
                },
            },
            item: headerAnimations.staggerItem,
        }),
        []
    );

    return {
        dropdownVariants,
        mobileMenuVariants,
        overlayVariants,
        getAnimationProps,
        createStaggerAnimation,
    };
}

// Animation utility functions
const animationUtils = {
    // Create spring transition with custom settings
    createSpring: (stiffness = 400, damping = 30, mass = 0.8) => ({
        type: "spring" as const,
        stiffness,
        damping,
        mass,
    }),

    // Create tween transition
    createTween: (duration = 0.3, ease: string = "easeOut") => ({
        type: "tween" as const,
        duration,
        ease,
    }),

    // Reduce motion detection
    shouldReduceMotion: () => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },

    // Get reduced motion variants
    getReducedMotionVariants: <T extends object>(variants: T): T | null => {
        if (animationUtils.shouldReduceMotion()) {
            return null;
        }
        return variants;
    },
};



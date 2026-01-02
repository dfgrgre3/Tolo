/**
 * Auth Animations
 * Shared animation variants for authentication components
 */

import type { Variants, Transition } from 'framer-motion';

// ==================== EASING ====================

export const EASINGS = {
    smooth: [0.4, 0, 0.2, 1],
    spring: [0.43, 0.13, 0.23, 0.96],
    bounce: [0.68, -0.55, 0.265, 1.55],
    snappy: [0.6, 0.05, 0.01, 0.9],
} as const;

// ==================== TRANSITIONS ====================

export const TRANSITIONS = {
    default: {
        duration: 0.3,
        ease: EASINGS.smooth,
    } as Transition,

    spring: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
    } as Transition,

    springBounce: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
    } as Transition,

    slow: {
        duration: 0.5,
        ease: EASINGS.smooth,
    } as Transition,

    fast: {
        duration: 0.15,
        ease: EASINGS.snappy,
    } as Transition,
} as const;

// ==================== FORM VARIANTS ====================

export const formVariants: Variants = {
    initial: {
        opacity: 0,
        y: 20,
        x: 0,
        scale: 0.98,
    },
    enter: {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        transition: {
            duration: 0.4,
            ease: EASINGS.smooth,
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.98,
        transition: {
            duration: 0.3,
            ease: EASINGS.smooth,
        },
    },
    shake: {
        opacity: 1,
        y: 0,
        x: [0, -10, 10, -8, 8, -4, 4, 0],
        transition: {
            duration: 0.5,
            ease: EASINGS.bounce,
        },
    },
};

// ==================== INPUT VARIANTS ====================

export const inputVariants: Variants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: TRANSITIONS.default,
    },
    focus: {
        scale: 1.01,
        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.3)',
    },
    error: {
        x: [0, -4, 4, -4, 4, 0],
        borderColor: '#ef4444',
        transition: {
            duration: 0.4,
        },
    },
};

// ==================== BUTTON VARIANTS ====================

export const buttonVariants: Variants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: TRANSITIONS.default,
    },
    hover: {
        scale: 1.02,
        y: -1,
        transition: TRANSITIONS.spring,
    },
    tap: {
        scale: 0.98,
        y: 0,
        transition: TRANSITIONS.fast,
    },
    disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    loading: {
        scale: [1, 1.02, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// ==================== SUCCESS VARIANTS ====================

export const successVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.5,
        rotate: -180,
    },
    enter: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 15,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.5,
        transition: TRANSITIONS.fast,
    },
    pulse: {
        scale: [1, 1.1, 1],
        transition: {
            duration: 0.8,
            repeat: 2,
            ease: 'easeInOut',
        },
    },
};

// ==================== ERROR VARIANTS ====================

export const errorVariants: Variants = {
    initial: {
        opacity: 0,
        height: 0,
        y: -10,
    },
    enter: {
        opacity: 1,
        height: 'auto',
        y: 0,
        transition: {
            height: { duration: 0.3 },
            opacity: { duration: 0.2, delay: 0.1 },
        },
    },
    exit: {
        opacity: 0,
        height: 0,
        y: -10,
        transition: {
            height: { duration: 0.2, delay: 0.1 },
            opacity: { duration: 0.2 },
        },
    },
};

// ==================== STAGGER CHILDREN ====================

export const staggerContainer: Variants = {
    initial: {},
    enter: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
    exit: {
        transition: {
            staggerChildren: 0.03,
            staggerDirection: -1,
        },
    },
};

export const staggerItem: Variants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: TRANSITIONS.default,
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: TRANSITIONS.fast,
    },
};

// ==================== SLIDE VARIANTS ====================

export const slideVariants: Variants = {
    enterFromRight: {
        x: '100%',
        opacity: 0,
    },
    enterFromLeft: {
        x: '-100%',
        opacity: 0,
    },
    center: {
        x: 0,
        opacity: 1,
        transition: TRANSITIONS.spring,
    },
    exitToLeft: {
        x: '-100%',
        opacity: 0,
        transition: TRANSITIONS.default,
    },
    exitToRight: {
        x: '100%',
        opacity: 0,
        transition: TRANSITIONS.default,
    },
};

// ==================== FADE VARIANTS ====================

export const fadeVariants: Variants = {
    initial: { opacity: 0 },
    enter: {
        opacity: 1,
        transition: TRANSITIONS.default,
    },
    exit: {
        opacity: 0,
        transition: TRANSITIONS.fast,
    },
};

// ==================== SCALE VARIANTS ====================

export const scaleVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.9,
    },
    enter: {
        opacity: 1,
        scale: 1,
        transition: TRANSITIONS.spring,
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: TRANSITIONS.fast,
    },
};

// ==================== TOOLTIP VARIANTS ====================

export const tooltipVariants: Variants = {
    initial: {
        opacity: 0,
        y: -4,
        scale: 0.95,
    },
    enter: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: TRANSITIONS.fast,
    },
    exit: {
        opacity: 0,
        y: -4,
        scale: 0.95,
        transition: TRANSITIONS.fast,
    },
};

// ==================== CONFETTI VARIANTS ====================

export const confettiVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0,
    },
    enter: {
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1.2, 1],
        y: [0, -20, -40, -60],
        transition: {
            duration: 1,
            ease: 'easeOut',
        },
    },
};

// ==================== CHECKMARK VARIANTS ====================

export const checkmarkPathVariants: Variants = {
    initial: {
        pathLength: 0,
        opacity: 0,
    },
    complete: {
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 0.4, ease: 'easeOut' },
            opacity: { duration: 0.3 },
        },
    },
};

// ==================== LOADING SPINNER ====================

export const spinnerVariants: Variants = {
    animate: {
        rotate: 360,
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// ==================== HAPTIC FEEDBACK ====================

/**
 * Trigger haptic feedback for mobile devices
 */
export function triggerHapticFeedback(
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
): void {
    if (typeof window === 'undefined') return;

    // Check for Vibration API support
    if ('vibrate' in navigator) {
        const patterns: Record<string, number | number[]> = {
            light: 10,
            medium: 30,
            heavy: 50,
            success: [10, 50, 10],
            warning: [30, 50, 30],
            error: [50, 100, 50, 100, 50],
        };

        navigator.vibrate(patterns[type] || 10);
    }
}

// ==================== ANIMATION HELPERS ====================

/**
 * Create staggered delay for list items
 */
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
    return index * baseDelay;
}

/**
 * Create animation sequence for form submission
 */
export const formSubmitSequence = {
    start: {
        scale: 0.98,
        transition: TRANSITIONS.fast,
    },
    loading: {
        scale: 1,
        transition: TRANSITIONS.default,
    },
    success: {
        scale: [1, 1.05, 1],
        transition: {
            duration: 0.4,
            ease: EASINGS.bounce,
        },
    },
    error: {
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: {
            duration: 0.5,
        },
    },
};

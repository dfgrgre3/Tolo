"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";

interface FocusModeState {
    isEnabled: boolean;
    isMinimal: boolean;
    hideNotifications: boolean;
    hideSearch: boolean;
    hideUserMenu: boolean;
    autoHideIdle: boolean;
    idleTimeout: number;
}

interface FocusModeActions {
    toggle: () => void;
    enable: () => void;
    disable: () => void;
    setMinimal: (value: boolean) => void;
    setHideNotifications: (value: boolean) => void;
    setHideSearch: (value: boolean) => void;
    setHideUserMenu: (value: boolean) => void;
    setAutoHideIdle: (value: boolean) => void;
    setIdleTimeout: (timeout: number) => void;
    reset: () => void;
}

const defaultState: FocusModeState = {
    isEnabled: false,
    isMinimal: false,
    hideNotifications: true,
    hideSearch: false,
    hideUserMenu: false,
    autoHideIdle: false,
    idleTimeout: 5000,
};

const STORAGE_KEY = "header_focus_mode";

export function useFocusMode() {
    const [state, setState] = useState<FocusModeState>(defaultState);
    const [mounted, setMounted] = useState(false);
    const [isIdle, setIsIdle] = useState(false);

    // Load saved preferences
    useEffect(() => {
        setMounted(true);
        const saved = safeGetItem(STORAGE_KEY, { fallback: null });
        if (saved && typeof saved === 'object' && saved !== null) {
            setState((prev) => ({ ...prev, ...(saved as Partial<FocusModeState>) }));
        }
    }, []);

    // Save preferences when they change
    useEffect(() => {
        if (mounted) {
            safeSetItem(STORAGE_KEY, state);
        }
    }, [state, mounted]);

    // Auto-hide on idle functionality
    useEffect(() => {
        if (!mounted || !state.autoHideIdle || !state.isEnabled) {
            setIsIdle(false);
            return;
        }

        let idleTimer: NodeJS.Timeout;

        const resetIdleTimer = () => {
            setIsIdle(false);
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                setIsIdle(true);
            }, state.idleTimeout);
        };

        // Events that reset idle timer
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        events.forEach((event) => {
            document.addEventListener(event, resetIdleTimer, { passive: true });
        });

        // Initial timer
        resetIdleTimer();

        return () => {
            clearTimeout(idleTimer);
            events.forEach((event) => {
                document.removeEventListener(event, resetIdleTimer);
            });
        };
    }, [mounted, state.autoHideIdle, state.isEnabled, state.idleTimeout]);

    // Keyboard shortcut (Ctrl/Cmd + Shift + F)
    useEffect(() => {
        if (!mounted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                setState((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mounted]);

    const actions: FocusModeActions = {
        toggle: useCallback(() => {
            setState((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
        }, []),

        enable: useCallback(() => {
            setState((prev) => ({ ...prev, isEnabled: true }));
        }, []),

        disable: useCallback(() => {
            setState((prev) => ({ ...prev, isEnabled: false }));
        }, []),

        setMinimal: useCallback((value: boolean) => {
            setState((prev) => ({ ...prev, isMinimal: value }));
        }, []),

        setHideNotifications: useCallback((value: boolean) => {
            setState((prev) => ({ ...prev, hideNotifications: value }));
        }, []),

        setHideSearch: useCallback((value: boolean) => {
            setState((prev) => ({ ...prev, hideSearch: value }));
        }, []),

        setHideUserMenu: useCallback((value: boolean) => {
            setState((prev) => ({ ...prev, hideUserMenu: value }));
        }, []),

        setAutoHideIdle: useCallback((value: boolean) => {
            setState((prev) => ({ ...prev, autoHideIdle: value }));
        }, []),

        setIdleTimeout: useCallback((timeout: number) => {
            setState((prev) => ({ ...prev, idleTimeout: timeout }));
        }, []),

        reset: useCallback(() => {
            setState(defaultState);
        }, []),
    };

    // Computed values for header visibility
    const shouldHideHeader = state.isEnabled && state.autoHideIdle && isIdle;
    const shouldShowMinimal = state.isEnabled && state.isMinimal;

    const visibilityState = {
        showNotifications: !state.isEnabled || !state.hideNotifications,
        showSearch: !state.isEnabled || !state.hideSearch,
        showUserMenu: !state.isEnabled || !state.hideUserMenu,
        showNavigation: !shouldShowMinimal,
        headerVisible: !shouldHideHeader,
    };

    return {
        state,
        actions,
        isIdle,
        visibilityState,
        mounted,
    };
}

// Context for global focus mode state
interface FocusModeContextType {
    state: FocusModeState;
    actions: FocusModeActions;
    isIdle: boolean;
    visibilityState: {
        showNotifications: boolean;
        showSearch: boolean;
        showUserMenu: boolean;
        showNavigation: boolean;
        headerVisible: boolean;
    };
}

const FocusModeContext = createContext<FocusModeContextType | null>(null);

function useFocusModeContext() {
    const context = useContext(FocusModeContext);
    if (!context) {
        throw new Error("useFocusModeContext must be used within FocusModeProvider");
    }
    return context;
}

;


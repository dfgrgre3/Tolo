import { useRef, useCallback, useState } from 'react';

/**
 * Hook to prevent double submission of forms.
 * Maintains a ref-based lock that persists through renders,
 * ensuring that rapid-fire clicks don't trigger multiple submissions
 * even if the React state hasn't updated yet.
 */
export function useSubmitLock() {
    const isSubmittingRef = useRef(false);
    // We still use state for UI feedback, but logic depends on Ref
    const [isLocked, setIsLocked] = useState(false);
    const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear timeout on unmount
    const clearSafetyTimeout = useCallback(() => {
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }
    }, []);

    const execute = useCallback(async <T>(
        fn: () => Promise<T>,
        options?: {
            keepLockedOnSuccess?: boolean;
            onError?: (error: unknown) => void;
            cooldownMs?: number;
        }
    ): Promise<T | undefined> => {
        // Double check ref to prevent race conditions
        if (isSubmittingRef.current) {
            return undefined;
        }

        clearSafetyTimeout();
        isSubmittingRef.current = true;
        setIsLocked(true);

        try {
            const result = await fn();

            if (options?.keepLockedOnSuccess) {
                // Keep locked (e.g., for navigation) but set a safety timeout
                // to release the lock eventually in case navigation fails silently
                safetyTimeoutRef.current = setTimeout(() => {
                    if (isSubmittingRef.current) {
                        isSubmittingRef.current = false;
                        setIsLocked(false);
                    }
                }, 5000); // 5 seconds safety release
            } else {
                isSubmittingRef.current = false;
                setIsLocked(false);
            }

            return result;
        } catch (error) {
            // Always unlock on error, but with a potential cooldown to prevent rage-clicking
            if (options?.cooldownMs) {
                setTimeout(() => {
                    if (isSubmittingRef.current) {
                        isSubmittingRef.current = false;
                        setIsLocked(false);
                    }
                }, options.cooldownMs);
            } else {
                isSubmittingRef.current = false;
                setIsLocked(false);
            }

            if (options?.onError) {
                options.onError(error);
            } else {
                throw error;
            }
        }
    }, [clearSafetyTimeout]);

    return {
        isLocked, // Use this for disabling buttons
        execute   // Wrap your submit handler with this
    };
}

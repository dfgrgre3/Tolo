import { useSyncExternalStore } from 'react';

/**
 * Hook to track network connection status
 * returns true if online, false if offline
 */
export function useNetworkStatus(): boolean {
    return useSyncExternalStore(
        (callback) => {
            if (typeof window === 'undefined') return () => {};
            window.addEventListener('online', callback);
            window.addEventListener('offline', callback);
            return () => {
                window.removeEventListener('online', callback);
                window.removeEventListener('offline', callback);
            };
        },
        () => navigator.onLine,
        () => true
    );
}

import { useState, useEffect } from 'react';

/**
 * Hook to track network connection status
 * returns true if online, false if offline
 */
export function useNetworkStatus(): boolean {
    // Assume online by default to avoid hydration mismatch, update in effect
    const [isOnline, setIsOnline] = useState<boolean>(true);

    useEffect(() => {
        // Correctly set initial state on client
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

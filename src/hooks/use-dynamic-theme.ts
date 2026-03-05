'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function useDynamicTheme() {
    const { setTheme, resolvedTheme } = useTheme();

    useEffect(() => {
        const updateTheme = () => {
            const hour = new Date().getHours();

            // Night: 7 PM - 6 AM
            // Day: 6 AM - 7 PM
            if (hour >= 19 || hour < 6) {
                if (resolvedTheme !== 'dark') {
                    setTheme('dark');
                }
            } else {
                if (resolvedTheme !== 'light') {
                    setTheme('light');
                }
            }
        };

        updateTheme();

        // Check every 30 minutes
        const interval = setInterval(updateTheme, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [setTheme, resolvedTheme]);

    return resolvedTheme;
}

"use client";

import { useRef, useCallback, useEffect } from "react";

interface AdaptiveDebounceOptions {
	minDelay?: number;
	maxDelay?: number;
	initialDelay?: number;
	increaseFactor?: number;
	decreaseFactor?: number;
	onDelayChange?: (delay: number) => void;
}

/**
 * Adaptive debounce hook that adjusts delay based on user typing speed
 * Faster typing = shorter delay, slower typing = longer delay
 */
export function useAdaptiveDebounce<T extends (...args: unknown[]) => void>(
	callback: T,
	options: AdaptiveDebounceOptions = {}
) {
	const {
		minDelay = 150,
		maxDelay = 600,
		initialDelay = 300,
		increaseFactor = 1.3,
		decreaseFactor = 0.8,
		onDelayChange,
	} = options;

	const delayRef = useRef(initialDelay);
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const lastCallTimeRef = useRef<number>(0);
	const callCountRef = useRef(0);

	// Reset delay when component unmounts
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const debouncedCallback = useCallback(
		(...args: Parameters<T>) => {
			const now = Date.now();
			const timeSinceLastCall = now - lastCallTimeRef.current;

			// If user is typing quickly (less than current delay), decrease delay
			if (timeSinceLastCall < delayRef.current && timeSinceLastCall > 0) {
				delayRef.current = Math.max(
					minDelay,
					Math.floor(delayRef.current * decreaseFactor)
				);
				callCountRef.current++;
			} else if (timeSinceLastCall > delayRef.current * 2) {
				// If user paused, increase delay for next time
				delayRef.current = Math.min(
					maxDelay,
					Math.floor(delayRef.current * increaseFactor)
				);
			}

			// Notify about delay change
			if (onDelayChange) {
				onDelayChange(delayRef.current);
			}

			// Clear existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Set new timeout
			timeoutRef.current = setTimeout(() => {
				callback(...args);
				lastCallTimeRef.current = Date.now();
			}, delayRef.current);

			lastCallTimeRef.current = now;
		},
		[callback, minDelay, maxDelay, increaseFactor, decreaseFactor, onDelayChange]
	);

	// Reset delay function
	const resetDelay = useCallback(() => {
		delayRef.current = initialDelay;
		if (onDelayChange) {
			onDelayChange(initialDelay);
		}
	}, [initialDelay, onDelayChange]);

	// Get current delay
	const getCurrentDelay = useCallback(() => delayRef.current, []);

	return {
		debouncedCallback,
		resetDelay,
		getCurrentDelay,
	};
}


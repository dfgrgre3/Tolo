"use client";

import { useEffect, useState } from "react";

/**
 * useMounted - returns true after the component has mounted on the client.
 *
 * Replaces the repeated `const [mounted, setMounted] = useState(false);
 * useEffect(() => requestAnimationFrame(() => setMounted(true)), [])` pattern
 * used across the header components, giving a single source of truth and
 * avoiding hydration mismatches.
 */
export function useMounted(): boolean {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const id = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(id);
	}, []);

	return mounted;
}

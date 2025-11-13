"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";

interface NavigationHistoryItem {
	path: string;
	title: string;
	timestamp: number;
	visitCount: number;
}

const HISTORY_KEY = "navigation_history";
const MAX_HISTORY_ITEMS = 50;

export function useNavigationHistory() {
	const pathname = usePathname();
	const [history, setHistory] = useState<NavigationHistoryItem[]>([]);
	const [canGoBack, setCanGoBack] = useState(false);
	const [canGoForward, setCanGoForward] = useState(false);

	// Load history from storage
	useEffect(() => {
		const stored = safeGetItem(HISTORY_KEY, { fallback: [] });
		if (Array.isArray(stored)) {
			setHistory(stored);
		}
	}, []);

	// Update history when pathname changes
	useEffect(() => {
		if (!pathname) return;

		const title = document.title || pathname;
		const now = Date.now();

		setHistory((prev) => {
			// Check if path already exists
			const existingIndex = prev.findIndex((item) => item.path === pathname);
			let updated: NavigationHistoryItem[];

			if (existingIndex >= 0) {
				// Update existing item
				updated = [...prev];
				updated[existingIndex] = {
					...updated[existingIndex],
					timestamp: now,
					visitCount: updated[existingIndex].visitCount + 1,
					title,
				};
			} else {
				// Add new item
				updated = [
					{
						path: pathname,
						title,
						timestamp: now,
						visitCount: 1,
					},
					...prev,
				].slice(0, MAX_HISTORY_ITEMS);
			}

			// Save to storage
			safeSetItem(HISTORY_KEY, updated);
			return updated;
		});
	}, [pathname]);

	// Get recent pages
	const getRecentPages = useCallback((limit: number = 10) => {
		return history
			.filter((item) => item.path !== pathname)
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, limit);
	}, [history, pathname]);

	// Get most visited pages
	const getMostVisited = useCallback((limit: number = 10) => {
		return history
			.filter((item) => item.path !== pathname)
			.sort((a, b) => b.visitCount - a.visitCount)
			.slice(0, limit);
	}, [history, pathname]);

	// Clear history
	const clearHistory = useCallback(() => {
		setHistory([]);
		safeSetItem(HISTORY_KEY, []);
	}, []);

	// Remove specific item
	const removeItem = useCallback((path: string) => {
		setHistory((prev) => {
			const updated = prev.filter((item) => item.path !== path);
			safeSetItem(HISTORY_KEY, updated);
			return updated;
		});
	}, []);

	return {
		history,
		canGoBack,
		canGoForward,
		getRecentPages,
		getMostVisited,
		clearHistory,
		removeItem,
	};
}


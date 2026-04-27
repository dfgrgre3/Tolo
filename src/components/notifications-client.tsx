"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from '@/lib/api/api-client';

import { logger } from '@/lib/logger';

async function getUserId(): Promise<string | null> {
	try {
		const data = await apiClient.get<any>('/auth/me');
		return data?.user?.id || null;
	} catch (error) {
		logger.error("Error getting user ID:", error);
		return null;
	}
}

type Reminder = {
	id: string;
	title: string;
	message?: string | null;
	remindAt: string;
	repeat?: string | null;
};

function getNextOccurrence(reminder: Reminder, now: Date): Date | null {
	const base = new Date(reminder.remindAt);
	if (!reminder.repeat) {
		return base >= now ? base : null;
	}
	if (reminder.repeat === "daily") {
		const next = new Date(base);
		while (next < now) next.setDate(next.getDate() + 1);
		return next;
	}
	if (reminder.repeat === "weekly") {
		const next = new Date(base);
		while (next < now) next.setDate(next.getDate() + 7);
		return next;
	}
	return null;
}

export default function NotificationsClient() {
	const [enabled, setEnabled] = useState(false);
	const [mounted, setMounted] = useState(false);
	const timersRef = useRef<{ id: string; occurrence: string; timer: number }[]>([]);
	const notifiedRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		setMounted(true);
		if (typeof window === "undefined" || typeof Notification === "undefined") return;
		if (Notification.permission === "granted") setEnabled(true);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined" || typeof Notification === "undefined") return;
		if (Notification.permission !== "granted" || !enabled) return;

		let active = true;

		(async () => {
			const userId = await getUserId();
			if (!userId) return;

			const loadAndSchedule = async () => {
				if (!active) return;

				try {
					const data = await apiClient.get<any>(`/reminders?userId=${encodeURIComponent(userId)}`);

					const payload = data?.data ?? data;
					const reminders: Reminder[] = Array.isArray(payload)
						? payload
						: Array.isArray(payload?.reminders)
							? payload.reminders
							: [];

					timersRef.current.forEach((t) => clearTimeout(t.timer));
					timersRef.current = [];

					const now = new Date();
					for (const r of reminders) {
						const next = getNextOccurrence(r, now);
						if (!next) continue;

						const notifyAt = new Date(next.getTime() - 10 * 60 * 1000);
						const occurrenceKey = `${r.id}:${next.toISOString()}`;

						if (notifiedRef.current.has(occurrenceKey)) continue;

						if (notifyAt < now) {
							if (now.getTime() - notifyAt.getTime() < 60 * 1000) {
								notifiedRef.current.add(occurrenceKey);
								new Notification(r.title, { body: r.message || "تذكير بعد 10 دقائق" });
							}
							continue;
						}

						const delay = notifyAt.getTime() - now.getTime();
						const timer = window.setTimeout(() => {
							if (notifiedRef.current.has(occurrenceKey)) return;
							notifiedRef.current.add(occurrenceKey);
							new Notification(r.title, { body: r.message || "تذكير بعد 10 دقائق" });
						}, delay);

						timersRef.current.push({ id: r.id, occurrence: next.toISOString(), timer });
					}
				} catch (error) {
					logger.warn("Error in loadAndSchedule:", error);
				}
			};

			await loadAndSchedule();
			const interval = window.setInterval(loadAndSchedule, 60 * 1000);

			return () => {
				active = false;
				clearInterval(interval);
				timersRef.current.forEach((t) => clearTimeout(t.timer));
				timersRef.current = [];
			};
		})();
	}, [mounted, enabled]);

	function requestPermission() {
		if (typeof Notification === "undefined") return;
		Notification.requestPermission().then((perm) => setEnabled(perm === "granted"));
	}

	if (!mounted || typeof Notification === "undefined") {
		return (
			<div className="mx-auto max-w-7xl px-4 py-2 text-xs text-muted-foreground opacity-0">
				<div className="h-6"></div>
			</div>
		);
	}

	if (Notification.permission !== "granted") {
		return (
			<div className="mx-auto max-w-7xl px-4 py-2 text-xs text-muted-foreground">
				<button className="px-2 py-1 border rounded-md" onClick={requestPermission} aria-label="تفعيل الإشعارات">
					تفعيل إشعارات التذكيرات
				</button>
			</div>
		);
	}

	return null;
}

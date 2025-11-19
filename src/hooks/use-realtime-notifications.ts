"use client";

import { useEffect, useRef, useCallback } from "react";
import { soundNotificationManager, NotificationSound } from "@/lib/notifications/sound-notifications";

import { logger } from '@/lib/logger';

interface RealtimeNotification {
	id: string;
	title: string;
	message: string;
	type?: "info" | "success" | "warning" | "error";
	category?: string;
	priority?: "low" | "medium" | "high";
	link?: string;
	actions?: Array<{ label: string; action: string; url?: string }>;
	isRead?: boolean;
	createdAt?: string;
}

interface UseRealtimeNotificationsOptions {
	onNotification?: (notification: RealtimeNotification) => void;
	enabled?: boolean;
	url?: string;
}

export function useRealtimeNotifications({
	onNotification,
	enabled = true,
	url = "/api/notifications/stream",
}: UseRealtimeNotificationsOptions = {}) {
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

	const connect = useCallback(() => {
		if (!enabled || typeof window === "undefined") return;

		try {
			// Close existing connection
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}

			// Create new EventSource connection
			const eventSource = new EventSource(url);
			eventSourceRef.current = eventSource;

			eventSource.onmessage = (event) => {
				try {
					const notification: RealtimeNotification = JSON.parse(event.data);
					
					// Play sound based on notification type
					if (notification.type) {
						soundNotificationManager.play(notification.type as NotificationSound);
					} else {
						soundNotificationManager.play("default");
					}

					// Show browser notification if permission granted
					if ("Notification" in window && Notification.permission === "granted") {
						new Notification(notification.title, {
							body: notification.message,
							icon: "/icon-192x192.png",
							tag: notification.id,
							data: {
								url: notification.link,
							},
						});
					}

					onNotification?.(notification);
				} catch (error) {
					logger.error("Error parsing notification:", error);
				}
			};

			eventSource.onerror = (error) => {
				logger.debug("EventSource error:", error);
				eventSource.close();

				// Reconnect after delay
				reconnectTimeoutRef.current = setTimeout(() => {
					connect();
				}, 5000);
			};
		} catch (error) {
			logger.error("Error connecting to notification stream:", error);
		}
	}, [enabled, url, onNotification]);

	useEffect(() => {
		if (enabled) {
			connect();
		}

		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, [enabled, connect]);

	return {
		disconnect: () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
		},
		reconnect: connect,
	};
}


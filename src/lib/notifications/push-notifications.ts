"use client";

/**
 * Web Push Notifications Service
 * Handles registration, subscription, and management of push n
import { logger } from '@/lib/logger';
otifications
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export interface PushSubscriptionData {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!("Notification" in window)) {
		logger.warn("This browser does not support notifications");
		return "denied";
	}

	if (Notification.permission === "default") {
		return await Notification.requestPermission();
	}

	return Notification.permission;
}

export async function registerServiceWorkerForPush(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) {
		logger.warn("Service Worker not supported");
		return null;
	}

	try {
		const registration = await navigator.serviceWorker.ready;
		return registration;
	} catch (error) {
		logger.error("Error registering service worker:", error);
		return null;
	}
}

export async function subscribeToPushNotifications(
	registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
	try {
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
		});

		return subscription;
	} catch (error) {
		logger.error("Error subscribing to push notifications:", error);
		return null;
	}
}

export async function unsubscribeFromPushNotifications(
	subscription: PushSubscription
): Promise<boolean> {
	try {
		return await subscription.unsubscribe();
	} catch (error) {
		logger.error("Error unsubscribing from push notifications:", error);
		return false;
	}
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export async function sendSubscriptionToServer(
	subscription: PushSubscription
): Promise<boolean> {
	try {
		const response = await fetch("/api/notifications/push/subscribe", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				subscription: {
					endpoint: subscription.endpoint,
					keys: {
						p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
						auth: arrayBufferToBase64(subscription.getKey("auth")!),
					},
				},
			}),
		});

		return response.ok;
	} catch (error) {
		logger.error("Error sending subscription to server:", error);
		return false;
	}
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}


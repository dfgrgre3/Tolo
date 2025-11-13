"use client";

/**
 * Sound Notifications Service
 * Handles audio notifications with customi
import { logger } from '@/lib/logger';
zable sounds
 */

export type NotificationSound = "default" | "success" | "error" | "warning" | "info" | "none";

const soundPaths: Record<NotificationSound, string> = {
	default: "/sounds/notification-default.mp3",
	success: "/sounds/notification-success.mp3",
	error: "/sounds/notification-error.mp3",
	warning: "/sounds/notification-warning.mp3",
	info: "/sounds/notification-info.mp3",
	none: "",
};

class SoundNotificationManager {
	private audioCache: Map<NotificationSound, HTMLAudioElement> = new Map();
	private volume: number = 0.5;
	private enabled: boolean = true;

	constructor() {
		if (typeof window !== "undefined") {
			// Load volume preference
			const savedVolume = localStorage.getItem("notification_sound_volume");
			if (savedVolume) {
				this.volume = parseFloat(savedVolume);
			}

			// Load enabled preference
			const savedEnabled = localStorage.getItem("notification_sound_enabled");
			if (savedEnabled !== null) {
				this.enabled = savedEnabled === "true";
			}
		}
	}

	private getAudio(sound: NotificationSound): HTMLAudioElement | null {
		if (sound === "none" || !this.enabled) return null;

		if (!this.audioCache.has(sound)) {
			const audio = new Audio(soundPaths[sound]);
			audio.volume = this.volume;
			audio.preload = "auto";
			this.audioCache.set(sound, audio);
		}

		return this.audioCache.get(sound) || null;
	}

	play(sound: NotificationSound = "default"): void {
		if (typeof window === "undefined") return;

		const audio = this.getAudio(sound);
		if (audio) {
			audio.currentTime = 0;
			audio.play().catch((error) => {
				logger.debug("Error playing notification sound:", error);
			});
		}
	}

	setVolume(volume: number): void {
		this.volume = Math.max(0, Math.min(1, volume));
		if (typeof window !== "undefined") {
			localStorage.setItem("notification_sound_volume", this.volume.toString());
		}
		// Update all cached audio elements
		this.audioCache.forEach((audio) => {
			audio.volume = this.volume;
		});
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (typeof window !== "undefined") {
			localStorage.setItem("notification_sound_enabled", enabled.toString());
		}
	}

	getVolume(): number {
		return this.volume;
	}

	isEnabled(): boolean {
		return this.enabled;
	}
}

export const soundNotificationManager = new SoundNotificationManager();


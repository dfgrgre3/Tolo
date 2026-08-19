"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	Activity,
	Bell,
	MessageSquare,
	Heart,
	Star,
	TrendingUp,
	Clock,
	ChevronLeft
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/contexts/websocket-context";

// ─── Types ───────────────────────────────────────────────────────

type ActivityType = "notification" | "message" | "like" | "achievement" | "progress";

interface RawActivity {
	id: string;
	type: ActivityType;
	title: string;
	description?: string;
	timestamp: string;
	read?: boolean;
	url?: string;
}

interface ActivityItem {
	id: string;
	type: ActivityType;
	title: string;
	description?: string;
	timestamp: Date;
	read: boolean;
	icon: LucideIcon;
	color: string;
	url?: string;
}

// ─── Constants ───────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<ActivityType, { icon: LucideIcon; color: string }> = {
	notification: { icon: Bell, color: "bg-blue-500" },
	message: { icon: MessageSquare, color: "bg-green-500" },
	like: { icon: Heart, color: "bg-red-500" },
	achievement: { icon: Star, color: "bg-yellow-500" },
	progress: { icon: TrendingUp, color: "bg-purple-500" }
};

const DEFAULT_CONFIG = { icon: Activity, color: "bg-gray-500" };

const POLL_INTERVAL_MS = 300_000;
const MAX_VISIBLE_ACTIVITIES = 5;
const WS_REFRESH_TYPES = new Set(["notification", "refresh_notifications", "activity_refresh"]);

// ─── Helpers ─────────────────────────────────────────────────────

const getActivityConfig = (type: string) =>
	ACTIVITY_CONFIG[type as ActivityType] ?? DEFAULT_CONFIG;

const mapRawToActivity = (item: RawActivity): ActivityItem => {
	const config = getActivityConfig(item.type);
	return {
		id: item.id,
		type: item.type,
		title: item.title,
		description: item.description,
		timestamp: new Date(item.timestamp),
		read: item.read ?? false,
		icon: config.icon,
		color: config.color,
		url: item.url
	};
};

// ─── Component ───────────────────────────────────────────────────

export function ActivityWidget() {
	const router = useRouter();
	const { user } = useAuth();
	const { socket, isConnected } = useWebSocket();

	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Hydration guard
	useEffect(() => {
		setMounted(true);
	}, []);

	// Fetch activities
	const fetchActivities = useCallback(async () => {
		try {
			const data = await apiClient.get<RawActivity[] | { activities: RawActivity[] }>(
				"/activities/recent?limit=10"
			);
			const rawList = Array.isArray(data) ? data : (data?.activities ?? []);
			const items = rawList.map(mapRawToActivity);

			setActivities(items);
			setUnreadCount(items.filter((a) => !a.read).length);
		} catch (error) {
			logger.debug("Failed to fetch activities:", error);
		}
	}, []);

	// Polling + WebSocket subscription
	useEffect(() => {
		if (!mounted || !user?.id) return;

		fetchActivities();

		// Poll only when WebSocket is disconnected
		if (!isConnected) {
			intervalRef.current = setInterval(fetchActivities, POLL_INTERVAL_MS);
		}

		// WebSocket listener
		const handleWsMessage = (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data as string);
				if (WS_REFRESH_TYPES.has(data.type)) {
					fetchActivities();
				}
			} catch {
				// Ignore malformed messages
			}
		};

		if (socket) {
			socket.addEventListener("message", handleWsMessage);
		}

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			if (socket) socket.removeEventListener("message", handleWsMessage);
		};
	}, [mounted, user?.id, isConnected, socket, fetchActivities]);

	// Mark single as read
	const markAsRead = useCallback(async (id: string) => {
		try {
			await apiClient.post(`/activities/${id}/read`, {});
			setActivities((prev) =>
				prev.map((item) => (item.id === id ? { ...item, read: true } : item))
			);
			setUnreadCount((prev) => Math.max(0, prev - 1));
		} catch (error) {
			logger.debug("Failed to mark as read:", error);
		}
	}, []);

	// Mark all as read
	const markAllAsRead = useCallback(async () => {
		try {
			await apiClient.post("/activities/read-all", {});
			setActivities((prev) => prev.map((item) => ({ ...item, read: true })));
			setUnreadCount(0);
		} catch (error) {
			logger.debug("Failed to mark all as read:", error);
		}
	}, []);

	// Navigate helper
	const navigateTo = useCallback(
		(url: string) => {
			setIsOpen(false);
			router.push(url);
		},
		[router]
	);

	// ─── Render guards ────────────────────────────────────────────

	if (!mounted || !user) return null;

	const recentActivities = activities.slice(0, MAX_VISIBLE_ACTIVITIES);
	const hasUnread = unreadCount > 0;

	// ─── Render ───────────────────────────────────────────────────

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-9 w-9 hover:bg-primary/10 dark:hover:bg-primary/15"
					aria-label={`النشاط الأخير${hasUnread ? `، ${unreadCount} غير مقروء` : ""}`}
				>
					<Activity className="h-4 w-4" aria-hidden="true" />
					{hasUnread && (
						<span
							className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center"
							aria-hidden="true"
						>
							<span className="text-[10px] font-bold text-white">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
					<DropdownMenuLabel className="flex items-center gap-2 p-0">
						<Activity className="h-4 w-4 text-primary" aria-hidden="true" />
						<span>النشاط الأخير</span>
						{hasUnread && (
							<span className="text-xs font-normal text-muted-foreground">
								({unreadCount} جديد)
							</span>
						)}
					</DropdownMenuLabel>

					{hasUnread && (
						<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
							تحديد الكل كمقروء
						</Button>
					)}
				</div>

				{/* List */}
				<div className="max-h-[400px] overflow-y-auto">
					{recentActivities.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
							<Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" aria-hidden="true" />
							<p className="text-sm font-medium text-foreground mb-1">لا يوجد نشاط</p>
							<p className="text-xs text-muted-foreground">سيظهر نشاطك هنا</p>
						</div>
					) : (
						<div className="p-2 space-y-1">
							{recentActivities.map((activity) => {
								const Icon = activity.icon;
								return (
									<DropdownMenuItem
										key={activity.id}
										onClick={() => {
											markAsRead(activity.id);
											if (activity.url) navigateTo(activity.url);
										}}
										className={cn(
											"flex items-start gap-3 p-3 rounded-lg cursor-pointer outline-none focus-visible:bg-accent",
											!activity.read && "bg-primary/5 border-r-2 border-primary"
										)}
									>
										<div
											className={cn(
												"flex items-center justify-center h-8 w-8 rounded-lg shrink-0 text-white",
												activity.color
											)}
										>
											<Icon className="h-4 w-4" aria-hidden="true" />
										</div>

										<div className="flex-1 min-w-0 text-right">
											<div className="flex items-center justify-between gap-2 mb-1">
												<p className="text-sm font-medium text-foreground truncate">
													{activity.title}
												</p>
												{!activity.read && (
													<span
														className="h-2 w-2 rounded-full bg-primary shrink-0"
														aria-label="غير مقروء"
													/>
												)}
											</div>

											{activity.description && (
												<p className="text-xs text-muted-foreground mb-1 line-clamp-2">
													{activity.description}
												</p>
											)}

											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Clock className="h-3 w-3" aria-hidden="true" />
												<span>
													{formatDistanceToNow(activity.timestamp, { addSuffix: true })}
												</span>
											</div>
										</div>
									</DropdownMenuItem>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				{recentActivities.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<div className="p-2">
							<Button
								variant="ghost"
								className="w-full justify-center text-xs"
								onClick={() => navigateTo("/activities")}
							>
								عرض الكل
								<ChevronLeft className="h-3 w-3 mr-1" aria-hidden="true" />
							</Button>
						</div>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
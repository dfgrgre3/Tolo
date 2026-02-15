"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
	Bell,
	Check,
	X,
	MoreVertical,
	Settings,
	Volume2,
	VolumeX,
	Clock,
	AlertCircle,
	Info,
	CheckCircle,
	XCircle,
	Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { VirtualList } from "@/components/ui/VirtualList";
import { cn } from "@/lib/utils";
import { soundNotificationManager, NotificationSound } from "@/lib/notifications/sound-notifications";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { logger } from '@/lib/logger';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
	id: string;
	title: string;
	message: string;
	type?: "info" | "success" | "warning" | "error";
	category?: string;
	priority?: "low" | "medium" | "high";
	isRead: boolean;
	link?: string;
	actions?: Array<{ label: string; action: string; url?: string }>;
	createdAt: string;
	time?: string;
}

import { type User } from "@/types/api/auth";

interface HeaderNotificationsProps {
	user: User | null;
	mounted: boolean;
}

const notificationIcons = {
	info: Info,
	success: CheckCircle,
	warning: AlertCircle,
	error: XCircle,
};

const notificationColors = {
	info: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
	success: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
	warning: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400",
	error: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
};

export function EnhancedNotifications({ user, mounted }: HeaderNotificationsProps) {
	const [isNotificationOpen, setIsNotificationOpen] = useState(false);
	const [notificationCount, setNotificationCount] = useState(0);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [filter, setFilter] = useState<"all" | "unread" | string>("all");
	const [soundEnabled, setSoundEnabled] = useState(true);
	const notificationRef = useRef<HTMLDivElement>(null);

	// Load sound preference
	useEffect(() => {
		if (mounted) {
			setSoundEnabled(soundNotificationManager.isEnabled());
		}
	}, [mounted]);

	// Realtime notifications
		const { disconnect } = useRealtimeNotifications({
		onNotification: (notification) => {
			// Add to notifications list
			setNotifications((prev) => {
				const newNotification: Notification = {
					id: notification.id || String(Date.now()),
					title: notification.title || '',
					message: notification.message || '',
					type: notification.type || 'info',
					isRead: notification.isRead || false,
					createdAt: notification.createdAt || new Date().toISOString(),
				};
				return [newNotification, ...prev];
			});
			setNotificationCount((prev) => prev + 1);
		},
		enabled: mounted && !!user,
	});

	// Fetch notifications
	useEffect(() => {
		if (!mounted || !user) return;

		const fetchNotifications = async () => {
			try {
				// Fetch notification count
				const countRes = await fetch("/api/notifications/unread-count");
				if (countRes.ok) {
					const countData = await countRes.json();
					if (countData.count !== undefined) {
						const prevCount = notificationCount;
						setNotificationCount(countData.count);

						// Play sound if new notification
						if (countData.count > prevCount && soundEnabled) {
							soundNotificationManager.play("default");
						}
					}
				}

				// Fetch recent notifications
				const params = new URLSearchParams({
					limit: "10",
					...(filter !== "all" && { unreadOnly: filter === "unread" ? "true" : "false" }),
					...(filter !== "all" && filter !== "unread" && { category: filter }),
				});

				const res = await fetch(`/api/notifications?${params}`);
				if (res.ok) {
					const data = await res.json();
					if (data.notifications) {
						setNotifications(data.notifications);
					} else if (Array.isArray(data)) {
						setNotifications(data);
					}
				}
			} catch (error) {
				logger.debug("Failed to fetch notifications:", error);
			}
		};

		fetchNotifications();
		const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

		return () => clearInterval(interval);
	}, [user, mounted, filter, notificationCount, soundEnabled]);

	// Group notifications by category
	const groupedNotifications = useMemo(() => {
		const groups: Record<string, Notification[]> = {};
		notifications.forEach((notif) => {
			const category = notif.category || "عام";
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(notif);
		});
		return groups;
	}, [notifications]);

	// Filtered notifications
	const filteredNotifications = useMemo(() => {
		if (filter === "all") return notifications;
		if (filter === "unread") return notifications.filter((n) => !n.isRead);
		return notifications.filter((n) => n.category === filter);
	}, [notifications, filter]);

	// Mark as read
	const markAsRead = async (id: string) => {
		try {
			await fetch("/api/notifications/mark-read", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notificationIds: [id] }),
			});
			setNotifications((prev) =>
				prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
			);
			setNotificationCount((prev) => Math.max(0, prev - 1));
		} catch (error) {
			logger.error("Error marking notification as read:", error);
		}
	};

	// Mark all as read
	const markAllAsRead = async () => {
		try {
			await fetch("/api/notifications/mark-read", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ all: true }),
			});
			setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
			setNotificationCount(0);
		} catch (error) {
			logger.error("Error marking all notifications as read:", error);
		}
	};

	// Toggle sound
	const toggleSound = () => {
		const newValue = !soundEnabled;
		setSoundEnabled(newValue);
		soundNotificationManager.setEnabled(newValue);
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		if (!mounted || !isNotificationOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				notificationRef.current &&
				!notificationRef.current.contains(target) &&
				!target?.closest?.("[data-notification-trigger]")
			) {
				setIsNotificationOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isNotificationOpen, mounted]);

	if (!mounted || !user) return null;

	return (
		<div className="relative" ref={notificationRef}>
			<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsNotificationOpen(!isNotificationOpen)}
					data-notification-trigger
					className="relative hover:bg-primary/10 hover:text-primary transition-all duration-300 group"
				>
					<Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />
					{notificationCount > 0 && (
						<motion.span
							initial={false}
							animate={{ scale: 1 }}
							style={{ transform: "none" }}
							className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-destructive via-destructive to-destructive/80 text-destructive-foreground text-[10px] font-bold shadow-lg ring-2 ring-background"
						>
							{notificationCount > 9 ? "9+" : notificationCount}
						</motion.span>
					)}
				</Button>
			</motion.div>

			<AnimatePresence>
				{isNotificationOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -10, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className="absolute left-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-xl z-50 max-h-[32rem] overflow-hidden flex flex-col"
					>
						{/* Header */}
						<div className="p-4 border-b border-border flex items-center justify-between">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-sm">الإشعارات</h3>
								{notificationCount > 0 && (
									<span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
										{notificationCount}
									</span>
								)}
							</div>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleSound}
									className="h-8 w-8"
									title={soundEnabled ? "تعطيل الصوت" : "تفعيل الصوت"}
								>
									{soundEnabled ? (
										<Volume2 className="h-4 w-4" />
									) : (
										<VolumeX className="h-4 w-4" />
									)}
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={markAllAsRead}>
											<Check className="h-4 w-4 mr-2" />
											تحديد الكل كمقروء
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem asChild>
											<Link href="/notifications">
												<Settings className="h-4 w-4 mr-2" />
												إعدادات الإشعارات
											</Link>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/* Filter Tabs */}
						<div className="px-4 py-2 border-b border-border flex items-center gap-2 overflow-x-auto">
							<button
								onClick={() => setFilter("all")}
								className={cn(
									"px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
									filter === "all"
										? "bg-primary text-primary-foreground"
										: "hover:bg-accent text-muted-foreground"
								)}
							>
								الكل
							</button>
							<button
								onClick={() => setFilter("unread")}
								className={cn(
									"px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
									filter === "unread"
										? "bg-primary text-primary-foreground"
										: "hover:bg-accent text-muted-foreground"
								)}
							>
								غير المقروء
							</button>
						</div>

						{/* Notifications List */}
						<div className="flex-1 overflow-y-auto" style={{ maxHeight: "24rem" }}>
							{filteredNotifications.length > 0 ? (
								<VirtualList
									items={filteredNotifications}
									itemHeight={100}
									containerHeight={384}
									keyExtractor={(item) => item.id}
									renderItem={(notification) => {
										const Icon = notificationIcons[notification.type || "info"];
										const colorClass = notificationColors[notification.type || "info"];

										return (
											<div
												className={cn(
													"p-4 border-b border-border last:border-0 transition-colors",
													!notification.isRead && "bg-primary/5"
												)}
											>
												<div className="flex items-start gap-3">
													<div className={cn("flex-shrink-0 p-2 rounded-lg", colorClass)}>
														<Icon className="h-4 w-4" />
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-start justify-between gap-2">
															<div className="flex-1 min-w-0">
																<p className="text-sm font-medium truncate">
																	{notification.title}
																</p>
																<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
																	{notification.message}
																</p>
																{notification.time && (
																	<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
																		<Clock className="h-3 w-3" />
																		{notification.time}
																	</p>
																)}
															</div>
															{!notification.isRead && (
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-6 w-6"
																	onClick={() => markAsRead(notification.id)}
																>
																	<Check className="h-3 w-3" />
																</Button>
															)}
														</div>
														{notification.actions && notification.actions.length > 0 && (
															<div className="flex items-center gap-2 mt-2">
																{notification.actions.map((action, idx) => (
																	<Button
																		key={idx}
																		variant="outline"
																		size="sm"
																		className="h-7 text-xs"
																		onClick={() => {
																			if (action.url) {
																				window.location.href = action.url;
																			}
																		}}
																	>
																		{action.label}
																	</Button>
																))}
															</div>
														)}
													</div>
												</div>
											</div>
										);
									}}
									overscan={2}
								/>
							) : (
								<div className="p-8 text-center text-muted-foreground">
									<Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">لا توجد إشعارات</p>
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="p-3 border-t border-border">
							<Link
								href="/notifications"
								onClick={() => setIsNotificationOpen(false)}
								className="block text-center text-xs text-primary hover:underline"
							>
								عرض جميع الإشعارات
							</Link>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}


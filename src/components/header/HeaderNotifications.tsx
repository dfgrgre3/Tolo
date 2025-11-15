"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { VirtualList } from "@/components/ui/VirtualList";

import { logger } from '@/lib/logger';

interface User {
	id: string;
	email: string;
	name?: string;
	role?: string;
}

interface Notification {
	id: string;
	title: string;
	message: string;
	type: string;
	isRead: boolean;
	createdAt: string;
}

interface HeaderNotificationsProps {
	user: User | null;
	mounted: boolean;
}

export function HeaderNotifications({ user, mounted }: HeaderNotificationsProps) {
	const [isNotificationOpen, setIsNotificationOpen] = useState(false);
	const [notificationCount, setNotificationCount] = useState(0);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const notificationRef = useRef<HTMLDivElement>(null);

	// Fetch notification count and recent notifications
	useEffect(() => {
		if (!mounted || !user) return;
		
		// Fetch notification count
		fetch("/api/notifications/unread-count")
			.then(async (res) => {
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				}
				const data = await res.json();
				if (data.count !== undefined) {
					setNotificationCount(data.count);
				}
			})
			.catch((error) => {
				logger.debug("Failed to fetch notification count:", error);
				setNotificationCount(0);
			});

		// Fetch recent notifications
		fetch("/api/notifications?limit=5")
			.then(async (res) => {
				if (res.ok) {
					const data = await res.json();
					if (Array.isArray(data)) {
						setNotifications(data);
					}
				}
			})
			.catch((error) => {
				logger.debug("Failed to fetch notifications:", error);
			});
	}, [user, mounted]);

	// Close notification dropdown when clicking outside
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

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isNotificationOpen, mounted]);

	if (!mounted || !user) return null;

	return (
		<div className="relative" ref={notificationRef}>
			<motion.div
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
			>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsNotificationOpen(!isNotificationOpen)}
					data-notification-trigger
					className="relative hover:bg-primary/10 hover:text-primary transition-all duration-300 group"
					suppressHydrationWarning
				>
					<Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />
					{notificationCount > 0 && (
						<motion.span
							initial={false}
							animate={{ scale: 1 }}
							style={{ transform: 'none' }}
							className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-destructive via-destructive to-destructive/80 text-destructive-foreground text-[10px] font-bold shadow-lg ring-2 ring-background"
							suppressHydrationWarning
						>
							{notificationCount > 9 ? "9+" : notificationCount}
						</motion.span>
					)}
				</Button>
			</motion.div>
			
			{/* Notifications Dropdown Content */}
			<AnimatePresence>
				{isNotificationOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -10, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col"
					>
						<div className="p-4 border-b border-border flex items-center justify-between">
							<h3 className="font-semibold text-sm">الإشعارات</h3>
							<Link
								href="/notifications"
								onClick={() => setIsNotificationOpen(false)}
								className="text-xs text-primary hover:underline"
							>
								عرض الكل
							</Link>
						</div>
						<div className="flex-1" style={{ height: "calc(24rem - 4rem)" }}>
							{notifications.length > 0 ? (
								<VirtualList
									items={notifications}
									itemHeight={100}
									containerHeight={384 - 64}
									keyExtractor={(item, index) => item.id || index}
									renderItem={(notification, index) => (
										<Link
											href={notification.link || "/notifications"}
											onClick={() => setIsNotificationOpen(false)}
											className="block p-4 hover:bg-accent transition-colors border-b border-border last:border-0"
										>
											<div className="flex items-start gap-3">
												<div className="flex-shrink-0 mt-1">
													<div className="w-2 h-2 rounded-full bg-primary" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">
														{notification.title || "إشعار جديد"}
													</p>
													<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
														{notification.message || notification.description || ""}
													</p>
													{notification.time && (
														<p className="text-xs text-muted-foreground mt-1">
															{notification.time}
														</p>
													)}
												</div>
											</div>
										</Link>
									)}
									overscan={2}
								/>
							) : (
								<div className="p-8 text-center text-muted-foreground">
									<Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">لا توجد إشعارات جديدة</p>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}


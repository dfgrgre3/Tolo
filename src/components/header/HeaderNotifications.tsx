"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
	Bell,
	Check,
	MoreVertical,
	Settings,
	Volume2,
	VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { VirtualList } from "@/components/ui/virtual-list";
import { cn } from "@/lib/utils";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { type User } from "@/types/user";
import { useNotificationsContext } from "@/providers/notifications-provider";
import { NotificationItem } from "./NotificationItem";
import { type Notification } from "@/types/notification";

interface HeaderNotificationsProps {
	user: User | null;
	mounted: boolean;
}

export function HeaderNotifications({ user, mounted }: HeaderNotificationsProps) {
	const [isNotificationOpen, setIsNotificationOpen] = useState(false);
	const notificationRef = useRef<HTMLDivElement>(null);

	const {
		unreadCount: notificationCount,
		notifications,
		isLoading,
		hasMore,
		markAsRead,
		markAsRead: markAllAsRead, // Using plural markAsRead(undefined, true) for all
		soundEnabled,
		toggleSound,
		loadMore
	} = useNotificationsContext();

	const [filter, setFilter] = useState<"all" | "unread">("all");

	const filteredNotifications = useMemo(() => {
		if (filter === "unread") return notifications.filter(n => !n.isRead);
		return notifications;
	}, [notifications, filter]);

	const handleMarkAllRead = async () => {
		await markAsRead(undefined, true);
	};

	const handleMarkAsRead = async (id: string) => {
		await markAsRead([id]);
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		if (!mounted || !isNotificationOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				notificationRef.current &&
				!notificationRef.current.contains(target) &&
				!target?.closest?.("[data-notification-trigger]") &&
				!target?.closest?.("[role='menu']") &&
				!target?.closest?.("[data-radix-popper-content-wrapper]")
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
					className="relative hover:bg-primary/10 dark:hover:bg-primary/15 hover:text-primary transition-all duration-300 group h-9 w-9 sm:h-10 sm:w-10 rounded-full"
				>
					<Bell className="h-5 w-5 sm:h-4 sm:w-4 transition-transform group-hover:rotate-12" />
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
										<DropdownMenuItem onClick={handleMarkAllRead}>
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
									keyExtractor={(item) => (item as Notification).id}
									renderItem={(notification) => (
										<NotificationItem
											key={(notification as Notification).id}
											notification={notification as Notification}
											markAsRead={handleMarkAsRead}
										/>
									)}
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

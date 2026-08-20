"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { Bell, Check, MoreVertical, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VirtualList } from "@/components/ui/virtual-list";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { User } from "@/types/user";
import type { Notification } from "@/types/notification";
import { useNotificationsContext } from "@/providers/notifications-provider";
import { NotificationItem } from "./NotificationItem";

// ─── Types ───────────────────────────────────────────────────────

interface HeaderNotificationsProps {
	user: User | null;
	mounted: boolean;
}

type NotificationFilter = "all" | "unread";

// ─── Component ───────────────────────────────────────────────────

export function HeaderNotifications({ user, mounted }: HeaderNotificationsProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [filter, setFilter] = useState<NotificationFilter>("all");
	const notificationRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const allTabRef = useRef<HTMLButtonElement>(null);
	const unreadTabRef = useRef<HTMLButtonElement>(null);

	const {
		unreadCount,
		notifications,
		markAsRead,
		soundEnabled,
		toggleSound
	} = useNotificationsContext();

	// ── Filtered notifications ────────────────────────────────────

	const filteredNotifications = useMemo(() => {
		if (filter === "unread") return notifications.filter((n) => !n.isRead);
		return notifications;
	}, [notifications, filter]);

	// ── Handlers ──────────────────────────────────────────────────

	const toggleOpen = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	const closePanel = useCallback(() => {
		setIsOpen(false);
	}, []);

	const handleMarkAllRead = useCallback(async () => {
		await markAsRead(undefined, true);
	}, [markAsRead]);

	const handleMarkAsRead = useCallback(
		async (id: string) => {
			await markAsRead([id]);
		},
		[markAsRead]
	);

	// ── Click outside to close ────────────────────────────────────

	useEffect(() => {
		if (!mounted || !isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				notificationRef.current &&
				!notificationRef.current.contains(target) &&
				!target?.closest?.("[data-notification-trigger]") &&
				!target?.closest?.("[role='menu']") &&
				!target?.closest?.("[data-radix-popper-content-wrapper]")
			) {
				closePanel();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, mounted, closePanel]);

	// ── Close on Escape ───────────────────────────────────────────

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") closePanel();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, closePanel]);

	// ── Tab keyboard navigation ───────────────────────────────────

	const handleTabKeyDown = useCallback((e: React.KeyboardEvent, current: NotificationFilter) => {
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			e.preventDefault();
			const next = current === "all" ? "unread" : "all";
			setFilter(next);
			setTimeout(() => {
				(next === "all" ? allTabRef : unreadTabRef).current?.focus();
			}, 0);
		}
	}, []);

	// ── Early return ──────────────────────────────────────────────

	if (!mounted || !user) return null;

	const hasUnread = unreadCount > 0;

	// ── Render ────────────────────────────────────────────────────

	return (
		<div className="relative" ref={notificationRef}>
			{/* Trigger Button */}
			<Button
				variant="ghost"
				size="icon"
				onClick={toggleOpen}
				data-notification-trigger
				className="relative hover:bg-primary/10 dark:hover:bg-primary/15 hover:text-primary h-9 w-9 sm:h-10 sm:w-10 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
				aria-label={`الإشعارات${hasUnread ? `، ${unreadCount} غير مقروء` : ""}`}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
			>
				<Bell className="h-4 w-4" aria-hidden="true" />
				{hasUnread && (
					<span
						className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold ring-2 ring-background"
						aria-hidden="true"
					>
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</Button>

			{/* Notifications Panel */}
			{isOpen && (
				<div
					ref={panelRef}
					role="region"
					aria-label="لوحة الإشعارات"
					className="absolute left-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden"
				>
					{/* Header */}
					<div className="p-4 border-b border-border flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<h3 className="font-semibold text-sm truncate">الإشعارات</h3>
							{hasUnread && (
								<span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
									{unreadCount}
								</span>
							)}
						</div>
						<div className="flex items-center gap-1 shrink-0">
							<Button
								variant="ghost"
								size="icon"
								onClick={toggleSound}
								className="h-8 w-8"
								aria-label={soundEnabled ? "تعطيل صوت الإشعارات" : "تفعيل صوت الإشعارات"}
								aria-pressed={soundEnabled}
							>
								{soundEnabled ? (
									<Volume2 className="h-4 w-4" aria-hidden="true" />
								) : (
									<VolumeX className="h-4 w-4" aria-hidden="true" />
								)}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										aria-label="خيارات الإشعارات"
									>
										<MoreVertical className="h-4 w-4" aria-hidden="true" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={handleMarkAllRead} disabled={!hasUnread}>
										<Check className="h-4 w-4 mr-2" aria-hidden="true" />
										تحديد الكل كمقروء
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<Link href="/notifications" onClick={closePanel}>
											<Settings className="h-4 w-4 mr-2" aria-hidden="true" />
											إعدادات الإشعارات
										</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{/* Filter Tabs */}
					<div className="px-4 py-2 border-b border-border flex items-center gap-2" role="tablist" aria-label="تصفية الإشعارات">
						<button
							ref={allTabRef}
							type="button"
							role="tab"
							id="notif-tab-all"
							aria-selected={filter === "all"}
							aria-controls="notif-panel-all"
							tabIndex={filter === "all" ? 0 : -1}
							onClick={() => setFilter("all")}
							onKeyDown={(e) => handleTabKeyDown(e, "all")}
							className={cn(
								"px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
								filter === "all"
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent text-muted-foreground"
							)}
						>
							الكل
						</button>
						<button
							ref={unreadTabRef}
							type="button"
							role="tab"
							id="notif-tab-unread"
							aria-selected={filter === "unread"}
							aria-controls="notif-panel-unread"
							tabIndex={filter === "unread" ? 0 : -1}
							onClick={() => setFilter("unread")}
							onKeyDown={(e) => handleTabKeyDown(e, "unread")}
							className={cn(
								"px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
								filter === "unread"
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent text-muted-foreground"
							)}
						>
							غير المقروء
						</button>
					</div>

					{/* Notifications List */}
					<div
						id={filter === "all" ? "notif-panel-all" : "notif-panel-unread"}
						role="tabpanel"
						aria-labelledby={filter === "all" ? "notif-tab-all" : "notif-tab-unread"}
						className="flex-1 overflow-y-auto"
						style={{ maxHeight: "24rem" }}
					>
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
							<div className="p-8 text-center text-muted-foreground" role="status" aria-live="polite">
								<Bell className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
								<p className="text-sm">لا توجد إشعارات</p>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="p-3 border-t border-border">
						<Link
							href="/notifications"
							onClick={closePanel}
							className="block text-center text-xs text-primary hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
						>
							عرض جميع الإشعارات
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}
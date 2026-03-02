"use client";

import React, { useState, useEffect, useRef } from "react";
import {
	Activity,
	Bell,
	MessageSquare,
	Heart,
	Star,
	TrendingUp,
	Clock,
	X,
	ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
// import removed
import { formatDistanceToNow } from "date-fns";

import { logger } from '@/lib/logger';

interface ActivityItem {
	id: string;
	type: "notification" | "message" | "like" | "achievement" | "progress";
	title: string;
	description?: string;
	timestamp: Date;
	read: boolean;
	icon: React.ReactNode;
	color: string;
	url?: string;
	action?: () => void;
}

export function ActivityWidget() {
	const authContext: any = { user: null, isAuthenticated: false, isLoading: false };
	const user = authContext?.user ?? null;
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted || !user) return;

		const fetchActivities = async () => {
			try {
				const response = await fetch("/api/activities/recent?limit=10");
				if (response.ok) {
					const data: ActivityItem[] = await response.json();
					const items: ActivityItem[] = data.map((item: ActivityItem) => ({
						id: item.id,
						type: item.type,
						title: item.title,
						description: item.description,
						timestamp: new Date(item.timestamp),
						read: item.read || false,
						icon: getIcon(item.type),
						color: getColor(item.type),
						action: () => {
							if (item.url) {
								window.location.href = item.url;
							}
						},
					}));
					setActivities(items);
					setUnreadCount(items.filter((item) => !item.read).length);
				}
			} catch (error) {
				logger.debug("Failed to fetch activities:", error);
			}
		};

		fetchActivities();
		intervalRef.current = setInterval(fetchActivities, 30000); // Update every 30 seconds

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [mounted, user]);

	const getIcon = (type: string) => {
		switch (type) {
			case "notification":
				return <Bell className="h-4 w-4" />;
			case "message":
				return <MessageSquare className="h-4 w-4" />;
			case "like":
				return <Heart className="h-4 w-4" />;
			case "achievement":
				return <Star className="h-4 w-4" />;
			case "progress":
				return <TrendingUp className="h-4 w-4" />;
			default:
				return <Activity className="h-4 w-4" />;
		}
	};

	const getColor = (type: string) => {
		switch (type) {
			case "notification":
				return "bg-blue-500";
			case "message":
				return "bg-green-500";
			case "like":
				return "bg-red-500";
			case "achievement":
				return "bg-yellow-500";
			case "progress":
				return "bg-purple-500";
			default:
				return "bg-gray-500";
		}
	};

	const markAsRead = async (id: string) => {
		try {
			await fetch(`/api/activities/${id}/read`, { method: "POST" });
			setActivities((prev) =>
				prev.map((item) => (item.id === id ? { ...item, read: true } : item))
			);
			setUnreadCount((prev) => Math.max(0, prev - 1));
		} catch (error) {
			logger.debug("Failed to mark as read:", error);
		}
	};

	const markAllAsRead = async () => {
		try {
			await fetch("/api/activities/read-all", { method: "POST" });
			setActivities((prev) => prev.map((item) => ({ ...item, read: true })));
			setUnreadCount(0);
		} catch (error) {
			logger.debug("Failed to mark all as read:", error);
		}
	};

	if (!mounted || !user) {
		return null;
	}

	const unreadActivities = activities.filter((item) => !item.read);
	const recentActivities = activities.slice(0, 5);

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-9 w-9 hover:bg-primary/10 dark:hover:bg-primary/15"
					aria-label="النشاط الأخير"
				>
					<Activity className="h-4 w-4" />
					{unreadCount > 0 && (
						<motion.span
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center"
						>
							<span className="text-[10px] font-bold text-white">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						</motion.span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<DropdownMenuLabel className="flex items-center gap-2 p-0">
						<Activity className="h-4 w-4 text-primary" />
						<span>النشاط الأخير</span>
						{unreadCount > 0 && (
							<span className="text-xs font-normal text-muted-foreground">({unreadCount} جديد)</span>
						)}
					</DropdownMenuLabel>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
							onClick={markAllAsRead}
						>
							تحديد الكل كمقروء
						</Button>
					)}
				</div>

				<div className="max-h-[400px] overflow-y-auto">
					{recentActivities.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
							<Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
							<p className="text-sm font-medium text-foreground mb-1">لا يوجد نشاط</p>
							<p className="text-xs text-muted-foreground">سيظهر نشاطك هنا</p>
						</div>
					) : (
						<div className="p-2 space-y-1">
							<AnimatePresence>
								{recentActivities.map((activity, index) => (
									<motion.div
										key={activity.id}
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -10 }}
										transition={{ delay: index * 0.05 }}
									>
										<DropdownMenuItem
											onClick={() => {
												markAsRead(activity.id);
												activity.action?.();
												setIsOpen(false);
											}}
											className={cn(
												"flex items-start gap-3 p-3 rounded-lg cursor-pointer",
												"hover:bg-accent transition-colors",
												!activity.read && "bg-primary/5 border-r-2 border-primary"
											)}
										>
											<div
												className={cn(
													"flex items-center justify-center h-8 w-8 rounded-lg shrink-0",
													activity.color,
													"text-white"
												)}
											>
												{activity.icon}
											</div>
											<div className="flex-1 min-w-0 text-right">
												<div className="flex items-center justify-between gap-2 mb-1">
													<p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
													{!activity.read && (
														<span className="h-2 w-2 rounded-full bg-primary shrink-0" />
													)}
												</div>
												{activity.description && (
													<p className="text-xs text-muted-foreground mb-1 line-clamp-2">
														{activity.description}
													</p>
												)}
												<div className="flex items-center gap-1 text-xs text-muted-foreground">
													<Clock className="h-3 w-3" />
													<span>
														{formatDistanceToNow(activity.timestamp, {
															addSuffix: true,
														})}
													</span>
												</div>
											</div>
											<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
										</DropdownMenuItem>
									</motion.div>
								))}
							</AnimatePresence>
						</div>
					)}
				</div>

				{recentActivities.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<div className="p-2">
							<Button
								variant="ghost"
								className="w-full justify-center text-xs"
								onClick={() => {
									setIsOpen(false);
									window.location.href = "/activities";
								}}
							>
								عرض الكل
								<ChevronRight className="h-3 w-3 mr-1" />
							</Button>
						</div>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}


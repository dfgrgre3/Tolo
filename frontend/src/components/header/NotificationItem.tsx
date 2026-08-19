import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, Info, CheckCircle, AlertCircle, XCircle, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";

// ─── Constants ───────────────────────────────────────────────────

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
	info: Info,
	success: CheckCircle,
	warning: AlertCircle,
	error: XCircle
};

const NOTIFICATION_COLORS: Record<string, string> = {
	info: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
	success: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
	warning: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400",
	error: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
};

const DEFAULT_TYPE = "info";

// ─── Types ───────────────────────────────────────────────────────

interface NotificationItemProps {
	notification: Notification;
	markAsRead: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────

export function NotificationItem({ notification, markAsRead }: NotificationItemProps) {
	const router = useRouter();

	const type = (notification.type || DEFAULT_TYPE).toLowerCase();
	const Icon = (NOTIFICATION_ICONS[type] ?? NOTIFICATION_ICONS[DEFAULT_TYPE]) as LucideIcon;
	const colorClass = NOTIFICATION_COLORS[type] ?? NOTIFICATION_COLORS[DEFAULT_TYPE];

	const handleMarkAsRead = useCallback(() => {
		markAsRead(notification.id);
	}, [markAsRead, notification.id]);

	const handleActionClick = useCallback(
		(url?: string) => {
			if (url) router.push(url);
		},
		[router]
	);

	const formattedDate = notification.createdAt
		? new Date(notification.createdAt).toLocaleString("ar-EG")
		: null;

	return (
		<div
			className={cn(
				"p-4 border-b border-border last:border-0",
				!notification.isRead && "bg-primary/5"
			)}
			role="article"
			aria-label={`${notification.title}${!notification.isRead ? "، غير مقروء" : ""}`}
		>
			<div className="flex items-start gap-3">
				{/* Icon */}
				<div className={cn("shrink-0 p-2 rounded-lg", colorClass)}>
					<Icon className="h-4 w-4" aria-hidden="true" />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2">
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">{notification.title}</p>
							<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
								{notification.message}
							</p>
							{formattedDate && (
								<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
									<Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
									<time dateTime={new Date(notification.createdAt!).toISOString()}>
										{formattedDate}
									</time>
								</p>
							)}
						</div>

						{/* Mark as read button */}
						{!notification.isRead && (
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 shrink-0"
								onClick={handleMarkAsRead}
								aria-label={`تحديد "${notification.title}" كمقروء`}
							>
								<Check className="h-3 w-3" aria-hidden="true" />
							</Button>
						)}
					</div>

					{/* Action buttons */}
					{notification.actions && notification.actions.length > 0 && (
						<div className="flex items-center gap-2 mt-2 flex-wrap">
							{notification.actions.map((action, idx) => {
								if (typeof action !== "object" || !action.label) return null;
								return (
									<Button
										key={`${notification.id}-action-${idx}`}
										variant="outline"
										size="sm"
										className="h-7 text-xs"
										onClick={() => handleActionClick(action.url)}
									>
										{action.label}
									</Button>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
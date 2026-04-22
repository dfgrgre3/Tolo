import React from "react";
import { Clock, Info, CheckCircle, AlertCircle, XCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Notification } from "@/types/notification";

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

interface NotificationItemProps {
	notification: Notification;
	markAsRead: (id: string) => void;
}

export function NotificationItem({ notification, markAsRead }: NotificationItemProps) {
	const type = (notification.type || "info").toLowerCase() as keyof typeof notificationIcons;
	const Icon = notificationIcons[type] || Info;
	const colorClass = notificationColors[type] || notificationColors.info;

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
}

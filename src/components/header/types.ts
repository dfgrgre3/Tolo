export interface Notification {
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

import { BookOpen, Users, MessageSquare, FileText } from "lucide-react";

export const typeConfig = {
	course: {
		icon: BookOpen,
		bgClass: "bg-blue-100 dark:bg-blue-900/40",
		textClass: "text-blue-600 dark:text-blue-400"
	},
	teacher: {
		icon: Users,
		bgClass: "bg-orange-100 dark:bg-orange-900/40",
		textClass: "text-orange-600 dark:text-orange-400"
	},
	forum: {
		icon: MessageSquare,
		bgClass: "bg-green-100 dark:bg-green-900/40",
		textClass: "text-green-600 dark:text-green-400"
	},
	exam: {
		icon: FileText,
		bgClass: "bg-purple-100 dark:bg-purple-900/40",
		textClass: "text-purple-600 dark:text-purple-400"
	}
} as const;

export const getResultConfig = (type: string) => {
	return typeConfig[type as keyof typeof typeConfig] || {
		icon: FileText,
		bgClass: "bg-gray-100 dark:bg-gray-800",
		textClass: "text-gray-600 dark:text-gray-400"
	};
};

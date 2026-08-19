import { BookOpen, Users, MessageSquare, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * نوع تكوين عنصر البحث الواحد
 */
export interface ResultConfig {
	icon: LucideIcon;
	bgClass: string;
	textClass: string;
}

/**
 * أنواع نتائج البحث المدعومة
 */
export type SearchResultType = "course" | "teacher" | "forum" | "exam";

/**
 * التكوين الافتراضي عند عدم تطابق النوع
 */
const DEFAULT_CONFIG: ResultConfig = {
	icon: FileText,
	bgClass: "bg-gray-100 dark:bg-gray-800",
	textClass: "text-gray-600 dark:text-gray-400"
};

/**
 * خريطة تكوينات أنواع نتائج البحث
 */
export const typeConfig: Record<SearchResultType, ResultConfig> = {
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
};

/**
 * إرجاع التكوين المناسب لنوع نتيجة البحث
 * @param type - نوع النتيجة القادم من البيانات
 * @returns التكوين المطابق أو التكوين الافتراضي
 */
export const getResultConfig = (type: string): ResultConfig => {
	return typeConfig[type as SearchResultType] ?? DEFAULT_CONFIG;
};
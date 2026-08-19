"use client";

import { Search, BookOpen, Users, MessageSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchScope } from "./search-types";

interface SearchScopeFiltersProps {
	searchScope: SearchScope;
	onScopeChange: (scope: SearchScope) => void;
	variant?: "mobile" | "desktop";
}

const SCOPE_ICONS: Record<SearchScope, typeof Search> = {
	all: Search,
	courses: BookOpen,
	teachers: Users,
	forum: MessageSquare,
	exams: FileText,
};

const SCOPE_LABELS: Record<SearchScope, string> = {
	all: "الكل",
	courses: "مواد",
	teachers: "معلمين",
	forum: "منتدى",
	exams: "اختبارات",
};

const SCOPES: SearchScope[] = ["all", "courses", "teachers", "forum", "exams"];

export const SearchScopeFilters = ({
	searchScope,
	onScopeChange,
	variant = "mobile"
}: SearchScopeFiltersProps) => {
	const isDesktop = variant === "desktop";

	return (
		<div
			className={cn(
				isDesktop
					? "absolute top-full left-0 right-0 mt-1 flex items-center gap-1 p-1 bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-lg z-40 pointer-events-auto"
					: "flex items-center gap-1 flex-wrap"
			)}
			role="tablist"
			aria-label="تصفية نتائج البحث"
		>
			{SCOPES.map((scope) => {
				const Icon = SCOPE_ICONS[scope];
				const isActive = searchScope === scope;

				return (
					<button
						key={scope}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onScopeChange(scope)}
						className={cn(
							"flex items-center gap-1.5 rounded-md text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
							isDesktop ? "px-2.5 py-1" : "px-2.5 py-1.5 touch-manipulation",
							isActive
								? "bg-primary text-primary-foreground"
								: isDesktop
									? "hover:bg-accent text-muted-foreground"
									: "bg-accent dark:bg-accent/50 hover:bg-accent/80 dark:hover:bg-accent/70 text-muted-foreground"
						)}
						title={SCOPE_LABELS[scope]}
					>
						<Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
						<span className={isDesktop ? "hidden lg:inline" : ""}>
							{SCOPE_LABELS[scope]}
						</span>
					</button>
				);
			})}
		</div>
	);
};
"use client";

import { Search, BookOpen, Users, MessageSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchScope } from "./search-types";

interface SearchScopeFiltersProps {
	searchScope: SearchScope;
	onScopeChange: (scope: SearchScope) => void;
	variant?: "mobile" | "desktop";
}

const SCOPE_ICONS = {
	all: Search,
	courses: BookOpen,
	teachers: Users,
	forum: MessageSquare,
	exams: FileText,
} as const;

const SCOPE_LABELS: Record<SearchScope, string> = {
	all: "الكل",
	courses: "مواد",
	teachers: "معلمين",
	forum: "منتدى",
	exams: "اختبارات",
};

const SCOPES: SearchScope[] = ["all", "courses", "teachers", "forum", "exams"];

export const SearchScopeFilters = ({ searchScope, onScopeChange, variant = "mobile" }: SearchScopeFiltersProps) => {
	const isDesktop = variant === "desktop";

	return (
		<div className={cn(
			isDesktop
				? "absolute top-full left-0 right-0 mt-1 flex items-center gap-1 p-1 bg-background/95 dark:bg-background/95 backdrop-blur-md border border-border/50 dark:border-border/50 rounded-lg shadow-lg dark:shadow-xl z-40 pointer-events-auto"
				: "flex items-center gap-1 flex-wrap"
		)}>
			{SCOPES.map((scope) => {
				const Icon = SCOPE_ICONS[scope];
				return (
					<button
						key={scope}
						type="button"
						onClick={() => onScopeChange(scope)}
						className={cn(
							isDesktop
								? "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all dark:transition-all"
								: "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all dark:transition-all touch-manipulation",
							searchScope === scope
								? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"
								: isDesktop
									? "hover:bg-accent dark:hover:bg-accent/80 text-muted-foreground dark:text-muted-foreground"
									: "bg-accent dark:bg-accent/50 hover:bg-accent/80 dark:hover:bg-accent/70 text-muted-foreground dark:text-muted-foreground"
						)}
						title={SCOPE_LABELS[scope]}
					>
						<Icon className="h-3 w-3" />
						<span className={isDesktop ? "hidden lg:inline" : "text-xs"}>{SCOPE_LABELS[scope]}</span>
					</button>
				);
			})}
		</div>
	);
};

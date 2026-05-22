"use client";

import { Clock, Search } from "lucide-react";

interface RecentSearchesProps {
	searches: string[];
	onSearchClick: (search: string) => void;
	variant?: "mobile" | "desktop";
}

export const RecentSearches = ({ searches, onSearchClick, variant = "mobile" }: RecentSearchesProps) => {
	const isDesktop = variant === "desktop";

	if (isDesktop) {
		return (
			<div className="p-2 border-b border-border/50 dark:border-border/50">
				<div className="px-3 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
					<Clock className="h-3.5 w-3.5" />
					البحث الأخير
				</div>
				{searches.map((search, index) => (
					<button
						key={index}
						type="button"
						onClick={() => onSearchClick(search)}
						className="w-full text-right px-4 py-2.5 hover:bg-accent dark:hover:bg-accent/80 transition-colors flex items-center gap-3 rounded-md text-sm"
					>
						<Search className="h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />
						<span className="flex-1">{search}</span>
					</button>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="px-2 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
				<Clock className="h-3.5 w-3.5" />
				البحث الأخير
			</div>
			{searches.map((search, index) => (
				<button
					key={index}
					type="button"
					onClick={() => onSearchClick(search)}
					className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-accent dark:hover:bg-accent/80 transition-colors flex items-center gap-2.5 border border-border/50 dark:border-border/50 touch-manipulation"
				>
					<Search className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
					<span className="flex-1 text-sm">{search}</span>
				</button>
			))}
		</div>
	);
};

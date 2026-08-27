"use client";

import { cn } from "@/lib/utils";
import { getResultConfig } from "./search-config";
import type { SearchResult } from "./search-types";

interface MobileSearchResultItemProps {
	result: SearchResult;
	onClick: (result: SearchResult) => void;
}

export const MobileSearchResultItem = ({ result, onClick }: MobileSearchResultItemProps) => {
	const config = getResultConfig(result.type);
	const IconComponent = config.icon;

	return (
		<button
			type="button"
			onClick={() => onClick(result)}
			className={cn(
				"w-full text-start px-3 py-3 rounded-lg flex items-center gap-2.5",
				"border border-border/50 dark:border-border/50 touch-manipulation",
				"hover:bg-accent dark:hover:bg-accent/80 active:bg-accent dark:active:bg-accent/90",
				"outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
			)}
		>
			<div className={cn("p-2 rounded-lg flex-shrink-0", config.bgClass)}>
				<IconComponent
					className={cn("h-4 w-4 flex-shrink-0", config.textClass)}
					aria-hidden="true"
				/>
			</div>

			<div className="flex-1 text-start min-w-0">
				<p className="text-sm font-medium truncate text-foreground dark:text-foreground" title={result.title}>
					{result.title}
				</p>

				{result.description && (
					<p
						className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5"
						title={result.description}
					>
						{result.description}
					</p>
				)}

				{result.category && (
					<span className="inline-block mt-1 text-xs text-muted-foreground dark:text-muted-foreground px-2 py-0.5 rounded-md bg-muted/50 dark:bg-muted/30">
						{result.category}
					</span>
				)}
			</div>
		</button>
	);
};
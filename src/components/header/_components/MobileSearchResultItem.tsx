"use client";

import { m } from "framer-motion";
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
		<m.button
			initial={{ opacity: 0, x: 10 }}
			animate={{ opacity: 1, x: 0 }}
			type="button"
			onClick={() => onClick(result)}
			className="w-full text-right px-3 py-3 rounded-lg hover:bg-accent dark:hover:bg-accent/80 transition-all duration-150 flex items-center gap-2.5 border border-border/50 dark:border-border/50 active:scale-95 touch-manipulation"
		>
			<div className={cn(
				"p-2 rounded-lg transition-all duration-150",
				config.bgClass
			)}>
				<IconComponent className={cn(
					"h-4 w-4 transition-colors",
					config.textClass
				)} />
			</div>
			<div className="flex-1 text-right min-w-0">
				<p className="text-sm font-medium truncate dark:text-foreground">{result.title}</p>
				{result.description && (
					<p className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5">
						{result.description}
					</p>
				)}
				{result.category && (
					<span className="inline-block mt-1 text-xs text-muted-foreground dark:text-muted-foreground px-2 py-0.5 rounded-md bg-muted/50 dark:bg-muted/30">
						{result.category}
					</span>
				)}
			</div>
		</m.button>
	);
};

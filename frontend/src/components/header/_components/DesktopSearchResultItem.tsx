"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResultConfig } from "./search-config";
import type { SearchResult } from "./search-types";

interface DesktopSearchResultItemProps {
	result: SearchResult;
	index: number;
	isSelected: boolean;
	onSelect: (index: number) => void;
	onClick: (result: SearchResult) => void;
}

export const DesktopSearchResultItem = ({
	result,
	index,
	isSelected,
	onSelect,
	onClick
}: DesktopSearchResultItemProps) => {
	const config = getResultConfig(result.type);
	const IconComponent = config.icon;
		
	return (
		<button
			type="button"
			onClick={() => onClick(result)}
			onMouseEnter={() => onSelect(index)}
			className={cn(
				"w-full text-right px-4 py-3 transition-all duration-150 flex items-center gap-3 border-b border-border/50 dark:border-border/50 last:border-0",
				isSelected
					? "bg-primary/10 dark:bg-primary/20 border-r-2 border-r-primary dark:border-r-primary"
					: "hover:bg-accent/80 dark:hover:bg-accent/60"
			)}
		>
			<div className={cn(
				"p-2 rounded-lg transition-all duration-150",
				config.bgClass,
				isSelected && "scale-110"
			)}>
				<IconComponent className={cn(
					"h-4 w-4 transition-colors",
					config.textClass
				)} />
			</div>
			<div className="flex-1 text-right min-w-0">
				<p className={cn(
					"text-sm font-medium truncate transition-colors",
					isSelected && "text-primary dark:text-primary"
				)}>{result.title}</p>
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
			<ChevronDown className={cn(
				"h-4 w-4 flex-shrink-0 rotate-90 transition-colors",
				isSelected ? "text-primary dark:text-primary" : "text-muted-foreground dark:text-muted-foreground"
			)} />
		</button>
	);
};

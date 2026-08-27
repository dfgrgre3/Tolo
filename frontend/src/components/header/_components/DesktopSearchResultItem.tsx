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
			id={`search-result-${index}`}
			role="option"
			aria-selected={isSelected}
			onClick={() => onClick(result)}
			onMouseEnter={() => onSelect(index)}
			className={cn(
				"w-full text-start px-4 py-3 flex items-center gap-3",
				"border-b border-border/50 dark:border-border/50 last:border-0",
				"border-r-2 outline-none",
				"focus-visible:ring-2 focus-visible:ring-primary/50",
				isSelected
					? "bg-primary/10 dark:bg-primary/20 border-r-primary dark:border-r-primary"
					: "border-r-transparent hover:bg-accent/80 dark:hover:bg-accent/60"
			)}
		>
			<div className={cn("p-2 rounded-lg flex-shrink-0", config.bgClass)}>
				<IconComponent className={cn("h-4 w-4", config.textClass)} />
			</div>

			<div className="flex-1 text-start min-w-0">
				<p
					className={cn(
						"text-sm font-medium truncate",
						isSelected && "text-primary dark:text-primary"
					)}
					title={result.title}
				>
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

			<ChevronDown
				className={cn(
					"h-4 w-4 flex-shrink-0 rotate-90",
					isSelected
						? "text-primary dark:text-primary"
						: "text-muted-foreground dark:text-muted-foreground"
				)}
			/>
		</button>
	);
};
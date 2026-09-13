"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MegaMenuCategory } from "./MegaMenuCategory";
import type { MegaMenuCategory as CategoryType } from "./types";

interface MegaMenuGridProps {
	categories: CategoryType[];
	isCompact: boolean;
	activeRoute?: (href: string) => boolean;
	onItemClick: (item: import("./types").NavItem, category: CategoryType) => void;
}

export function groupMegaMenuCategories(categories: CategoryType[]): CategoryType[][] {
	// Categories sharing the same columnKey stack into one visual column,
	// each keeping its own heading with its links below it. This keeps the
	// number of columns low and lets a column hold many links (8+) instead
	// of spreading every category into its own column.
	const order: string[] = [];
	const groups = new Map<string, CategoryType[]>();

	categories.forEach((category) => {
		const key = category.columnKey || category.slug || category.id || category.title;
		if (!groups.has(key)) {
			order.push(key);
			groups.set(key, []);
		}
		groups.get(key)!.push(category);
	});

	return order.map((key) => groups.get(key)!);
}

export const MegaMenuGrid = React.memo(function MegaMenuGrid({
	categories,
	isCompact,
	activeRoute,
	onItemClick
}: MegaMenuGridProps) {
	const columns = groupMegaMenuCategories(categories);

	return (
		<div
			className={cn(
				// Columns share the full menu width instead of hugging one side
				// with empty space left over. Each column stacks its categories
				// vertically (heading + links), so a long list never creates
				// another column or pushes columns onto a second row.
				"flex w-full flex-nowrap items-start",
				isCompact ? "gap-x-4" : "gap-x-8"
			)}
		>
			{columns.map((column, columnIndex) => (
				<div
					className="flex min-w-0 flex-1 flex-col gap-5 max-w-[320px]"
					key={`mega-column-${columnIndex}`}
				>
					{column.map((category, categoryIndex) => (
						<MegaMenuCategory
							key={category.slug || category.id || `${category.title}-${categoryIndex}`}
							category={category}
							categoryIndex={categoryIndex}
							onItemClick={onItemClick}
							activeRoute={activeRoute}
							isCompact={isCompact}
						/>
					))}
				</div>
			))}
		</div>
	);
});

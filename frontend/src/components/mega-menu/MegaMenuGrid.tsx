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
	return categories.map((category) => [category]);
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
				// Each category owns one column so headings and their link groups
				// stay visually independent and predictable.
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

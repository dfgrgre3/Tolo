"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MegaMenuCategory } from "./MegaMenuCategory";
import type { MegaMenuCategory as CategoryType } from "./types";

interface MegaMenuGridProps {
	categories: CategoryType[];
	gridCols: string;
	isCompact: boolean;
	searchQuery: string;
	focusedCategoryIndex: number;
	focusedItemIndex: number;
	onClose: () => void;
	activeRoute?: (href: string) => boolean;
	setCategoryRef: (index: number, el: HTMLDivElement | null) => void;
}

export const MegaMenuGrid = React.memo(function MegaMenuGrid({
	categories,
	gridCols,
	isCompact,
	searchQuery,
	focusedCategoryIndex,
	focusedItemIndex,
	onClose,
	activeRoute,
	setCategoryRef
}: MegaMenuGridProps) {
	return (
		<div
			className={cn(
				"px-4 md:px-6",
				isCompact ? 'py-3 md:py-4' : 'py-4 md:py-5'
			)}
		>
			<div className={cn(
				"grid",
				gridCols,
				isCompact ? 'gap-2 md:gap-3' : 'gap-4 md:gap-5'
			)}>
				{categories.map((category, categoryIndex) => (
					<div key={`${category.title}-${categoryIndex}`} className="h-full">
						<MegaMenuCategory
							ref={(el) => setCategoryRef(categoryIndex, el)}
							category={category}
							categoryIndex={categoryIndex}
							onItemClick={onClose}
							activeRoute={activeRoute}
							isCompact={isCompact}
							searchQuery={searchQuery}
							focusedItemIndex={focusedCategoryIndex === categoryIndex ? focusedItemIndex : -1}
						/>
					</div>
				))}
			</div>
		</div>
	);
});

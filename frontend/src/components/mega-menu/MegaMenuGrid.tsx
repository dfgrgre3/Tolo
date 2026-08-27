"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MegaMenuCategory } from "./MegaMenuCategory";
import type { MegaMenuCategory as CategoryType } from "./types";

interface MegaMenuGridProps {
	categories: CategoryType[];
	gridCols: string;
	isCompact: boolean;
	focusedCategoryIndex: number;
	focusedItemIndex: number;
	onClose: () => void;
	activeRoute?: (href: string) => boolean;
	setCategoryRef: (index: number, el: HTMLDivElement | null) => void;
	onItemClick?: (item: import("./types").NavItem, category: CategoryType) => void;
}

export const MegaMenuGrid = React.memo(function MegaMenuGrid({
	categories,
	gridCols,
	isCompact,
	focusedCategoryIndex,
	focusedItemIndex,
	onClose,
	activeRoute,
	setCategoryRef,
	onItemClick
}: MegaMenuGridProps) {
	return (
		<div
			className={cn(
				"grid",
				gridCols,
				isCompact ? "gap-x-8 gap-y-6" : "gap-x-10 gap-y-8"
			)}
		>
			{categories.map((category, categoryIndex) => (
				<MegaMenuCategory
					key={`${category.title}-${categoryIndex}`}
					ref={(el) => setCategoryRef(categoryIndex, el)}
					category={category}
					categoryIndex={categoryIndex}
					onItemClick={(item, cat) => {
						onItemClick?.(item, cat);
						onClose();
					}}
					activeRoute={activeRoute}
					isCompact={isCompact}
					focusedItemIndex={focusedCategoryIndex === categoryIndex ? focusedItemIndex : -1}
				/>
			))}
		</div>
	);
});

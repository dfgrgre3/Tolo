"use client";

import React from "react";
import { motion } from "framer-motion";
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

export function MegaMenuGrid({
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
		<motion.div
			key="content"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className={cn(
				"px-4 md:px-6",
				isCompact ? 'py-4 md:py-5' : 'py-6 md:py-8'
			)}
		>
			<div className={cn(
				"grid",
				gridCols,
				isCompact ? 'gap-3 md:gap-4' : 'gap-5 md:gap-6'
			)}>
				{categories.map((category, categoryIndex) => (
					<MegaMenuCategory
						key={`${category.title}-${categoryIndex}`}
						ref={(el) => setCategoryRef(categoryIndex, el)}
						category={category}
						categoryIndex={categoryIndex}
						onItemClick={onClose}
						activeRoute={activeRoute}
						isCompact={isCompact}
						searchQuery={searchQuery}
						focusedItemIndex={focusedCategoryIndex === categoryIndex ? focusedItemIndex : -1}
					/>
				))}
			</div>
		</motion.div>
	);
}

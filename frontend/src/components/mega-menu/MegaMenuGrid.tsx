"use client";

import React from "react";
import { m } from "framer-motion";
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

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.04,
			delayChildren: 0.02,
		}
	},
	exit: {
		opacity: 0,
		transition: {
			staggerChildren: 0.02,
			staggerDirection: -1,
		}
	}
};

const itemVariants = {
	hidden: { opacity: 0, y: 12, scale: 0.98 },
	visible: { 
		opacity: 1, 
		y: 0, 
		scale: 1,
		transition: { 
			type: "spring" as const, 
			stiffness: 140, 
			damping: 18 
		} 
	},
	exit: { opacity: 0, y: -8, scale: 0.99, transition: { duration: 0.15 } }
};

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
		<m.div
			key="content"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
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
					<m.div
						key={`${category.title}-${categoryIndex}`}
						variants={itemVariants}
						className="h-full"
					>
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
					</m.div>
				))}
			</div>
		</m.div>
	);
});

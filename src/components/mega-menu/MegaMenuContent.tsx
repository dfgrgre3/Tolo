"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/shared/button";
import type { MegaMenuProps } from "./types";
import { MegaMenuCategory } from "./MegaMenuCategory";

export function MegaMenuContent({ 
	categories, 
	isOpen, 
	onClose, 
	activeRoute 
}: MegaMenuProps) {
	if (!isOpen) return null;

	// Calculate optimal grid columns based on number of categories
	const gridCols = useMemo(() => {
		const count = categories.length;
		if (count === 1) return "grid-cols-1";
		if (count === 2) return "sm:grid-cols-2";
		if (count === 3) return "sm:grid-cols-2 md:grid-cols-3";
		if (count === 4) return "sm:grid-cols-2 md:grid-cols-4";
		if (count === 5) return "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
		return "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
	}, [categories.length]);

	// Calculate total items count for dynamic sizing
	const totalItems = useMemo(() => {
		return categories.reduce((sum, cat) => sum + cat.items.length, 0);
	}, [categories]);

	// Determine if we need compact mode (many items)
	const isCompact = totalItems > 15;

	return (
		<>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.15 }}
				className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
				onClick={onClose}
			/>
			<motion.div
				initial={{ opacity: 0, y: -10, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: -10, scale: 0.98 }}
				transition={{ 
					type: "spring",
					stiffness: 400,
					damping: 35,
					mass: 0.7
				}}
				className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-[95vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl bg-gradient-to-br from-popover via-popover to-popover/98 rounded-b-2xl border border-border/50 shadow-2xl shadow-black/30 z-50 overflow-hidden backdrop-blur-xl supports-[backdrop-filter]:bg-popover/95"
				onMouseEnter={() => {}}
				onMouseLeave={onClose}
				data-mega-menu-content
			>
				{/* Decorative gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/2 to-primary/5 pointer-events-none" />
				
				{/* Compact header - only show close button */}
				<div className="relative border-b border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
					<div className="flex items-center justify-end px-3 py-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="h-8 w-8 rounded-lg hover:bg-destructive/15 hover:text-destructive transition-all duration-200 hover:scale-110"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Content section - dynamic sizing */}
				<div className={`relative overflow-y-auto ${isCompact ? 'max-h-[70vh]' : 'max-h-[80vh]'} scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent`}>
					<div className={`px-4 md:px-6 ${isCompact ? 'py-4 md:py-5' : 'py-5 md:py-6'}`}>
						<div className={`grid ${gridCols} ${isCompact ? 'gap-3 md:gap-4' : 'gap-4 md:gap-5'}`}>
							{categories.map((category, categoryIndex) => (
								<MegaMenuCategory
									key={category.title}
									category={category}
									categoryIndex={categoryIndex}
									onItemClick={onClose}
									activeRoute={activeRoute}
									isCompact={isCompact}
								/>
							))}
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
}

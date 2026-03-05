"use client";

import React, { forwardRef, memo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MegaMenuCategory as MegaMenuCategoryType } from "./types";
import { MegaMenuItem } from "./MegaMenuItem";

interface MegaMenuCategoryProps {
	category: MegaMenuCategoryType;
	categoryIndex: number;
	onItemClick: () => void;
	activeRoute?: (href: string) => boolean;
	isCompact?: boolean;
	searchQuery?: string;
	focusedItemIndex?: number;
}

export const MegaMenuCategory = memo(forwardRef<HTMLDivElement, MegaMenuCategoryProps>(function MegaMenuCategory({ 
	category, 
	categoryIndex, 
	onItemClick,
	activeRoute,
	isCompact = false,
	searchQuery = "",
	focusedItemIndex = -1
}, ref) {
	const hasActiveSearch = Boolean(searchQuery?.trim());
	const itemCount = category.items.length;

	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: 10, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ 
				delay: categoryIndex * 0.03, 
				duration: 0.35,
				ease: [0.22, 1, 0.36, 1]
			}}
			whileHover={{ scale: 1.01 }}
			className={cn(
				"space-y-3 group/category relative rounded-2xl p-3 md:p-5 transition-all duration-500",
				"bg-white/[0.02] border border-white/5",
				category.isPriority ? "border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]" : "hover:bg-white/[0.05] hover:border-white/10",
				isCompact && "space-y-2 p-2 md:p-3"
			)}
			role="group"
			aria-labelledby={`category-title-${categoryIndex}`}
		>
			{/* Animated background glow */}
			<motion.div
				className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover/category:opacity-100 transition-opacity duration-500 blur-xl"
				initial={false}
			/>

			{/* Category Header */}
			<div className={cn(
				"flex items-center gap-2 mb-3 pb-3 border-b border-border/40 group-hover/category:border-primary/50 transition-all duration-300 relative z-10",
				isCompact && "mb-2 pb-2 gap-1.5"
			)}>
				{/* Animated underline */}
				<motion.div 
					className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full"
					initial={{ width: 0 }}
					whileHover={{ width: "100%" }}
					transition={{ duration: 0.4, ease: "easeOut" }}
				/>
				
				{/* Icon */}
				<motion.div
					whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
					whileTap={{ scale: 0.95 }}
					className={cn(
						"p-1.5 rounded-lg bg-gradient-to-br from-primary/15 via-primary/10 to-primary/8",
						"group-hover/category:from-primary/25 group-hover/category:via-primary/15 group-hover/category:to-primary/10",
						"transition-all duration-300 shadow-sm group-hover/category:shadow-md group-hover/category:shadow-primary/20",
						"border border-primary/20 group-hover/category:border-primary/30",
						isCompact && "p-1"
					)}
				>
					{hasActiveSearch ? (
						<Zap className={cn("h-3.5 w-3.5 text-primary", isCompact && "h-3 w-3")} />
					) : (
						<Sparkles className={cn("h-3.5 w-3.5 text-primary", isCompact && "h-3 w-3")} />
					)}
				</motion.div>
				
				<div className="flex-1 flex items-center justify-between">
					<div className="flex flex-col">
						<h3 
							id={`category-title-${categoryIndex}`}
							className={cn(
								"font-black text-foreground group-hover/category:text-primary transition-colors duration-300 flex items-center gap-2",
								isCompact ? "text-sm" : "text-base md:text-lg"
							)}
						>
							{category.title}
						</h3>
						{category.priorityLabel && !isCompact && (
							<span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">
								{category.priorityLabel}
							</span>
						)}
					</div>
					
					{/* Item count badge */}
					<motion.span
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						className={cn(
							"text-[10px] font-black px-2 py-0.5 rounded-lg transition-colors",
							category.isPriority 
								? "bg-primary text-white shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
								: hasActiveSearch 
									? "bg-primary/15 text-primary border border-primary/30" 
									: "bg-white/5 text-gray-500 border border-white/10"
						)}
					>
						{itemCount}
					</motion.span>
				</div>

				{/* Expand indicator */}
				<motion.div
					className="text-muted-foreground/50 group-hover/category:text-primary/50 transition-colors"
					whileHover={{ x: -3 }}
				>
					<ChevronLeft className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} />
				</motion.div>
			</div>
			
			{/* Items List */}
			<div 
				className={cn("space-y-2 relative z-10", isCompact && "space-y-1.5")}
				role="list"
			>
				{category.items.map((item, itemIndex) => (
					<MegaMenuItem
						key={item.href}
						item={item}
						isActive={activeRoute ? activeRoute(item.href) : false}
						onClick={onItemClick}
						delay={categoryIndex * 0.03 + itemIndex * 0.02}
						isCompact={isCompact}
						searchQuery={searchQuery}
						isFocused={focusedItemIndex === itemIndex}
					/>
				))}
			</div>

			{/* View All Link for categories with many items */}
			{itemCount > 4 && !isCompact && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="pt-2 relative z-10"
				>
					<button
						onClick={onItemClick}
						className="text-xs text-primary/70 hover:text-primary font-medium flex items-center gap-1 transition-colors"
					>
						<span>عرض الكل</span>
						<ChevronLeft className="h-3 w-3" />
					</button>
				</motion.div>
			)}
		</motion.div>
	);
}));

MegaMenuCategory.displayName = "MegaMenuCategory";

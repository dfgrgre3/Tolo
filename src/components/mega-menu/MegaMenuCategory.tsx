"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MegaMenuCategory as MegaMenuCategoryType } from "./types";
import { MegaMenuItem } from "./MegaMenuItem";

interface MegaMenuCategoryProps {
	category: MegaMenuCategoryType;
	categoryIndex: number;
	onItemClick: () => void;
	activeRoute?: (href: string) => boolean;
	isCompact?: boolean;
}

export function MegaMenuCategory({ 
	category, 
	categoryIndex, 
	onItemClick,
	activeRoute,
	isCompact = false
}: MegaMenuCategoryProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ 
				delay: categoryIndex * 0.03, 
				duration: 0.3,
				ease: [0.22, 1, 0.36, 1]
			}}
			className={cn("space-y-3 group/category", isCompact && "space-y-2")}
		>
			<div className={cn(
				"flex items-center gap-2 mb-3 pb-3 border-b border-border/40 group-hover/category:border-primary/50 transition-all duration-300 relative",
				isCompact && "mb-2 pb-2 gap-1.5"
			)}>
				<div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/60 group-hover/category:w-full transition-all duration-500" />
				<motion.div
					whileHover={{ scale: 1.1, rotate: 3 }}
					className={cn(
						"p-1.5 rounded-lg bg-gradient-to-br from-primary/12 via-primary/8 to-primary/5 group-hover/category:from-primary/20 group-hover/category:via-primary/12 group-hover/category:to-primary/8 transition-all duration-300 shadow-sm group-hover/category:shadow-md group-hover/category:shadow-primary/15 border border-primary/15 group-hover/category:border-primary/25",
						isCompact && "p-1"
					)}
				>
					<Sparkles className={cn("h-3.5 w-3.5 text-primary", isCompact && "h-3 w-3")} />
				</motion.div>
				<h3 className={cn(
					"font-semibold text-foreground group-hover/category:text-primary transition-colors duration-300",
					isCompact ? "text-sm" : "text-base md:text-lg"
				)}>
					{category.title}
				</h3>
			</div>
			<div className={cn("space-y-2", isCompact && "space-y-1.5")}>
				{category.items.map((item, itemIndex) => (
					<MegaMenuItem
						key={item.href}
						item={item}
						isActive={activeRoute ? activeRoute(item.href) : false}
						onClick={onItemClick}
						delay={categoryIndex * 0.03 + itemIndex * 0.02}
						isCompact={isCompact}
					/>
				))}
			</div>
		</motion.div>
	);
}


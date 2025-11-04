"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NavItem } from "./types";

interface MegaMenuItemProps {
	item: NavItem;
	isActive: boolean;
	onClick: () => void;
	delay?: number;
	isCompact?: boolean;
}

export function MegaMenuItem({ item, isActive, onClick, delay = 0, isCompact = false }: MegaMenuItemProps) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -5, scale: 0.98 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			transition={{ delay, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
			whileHover={{ scale: 1.01 }}
		>
			<Link
				href={item.href}
				onClick={onClick}
				className={cn(
					"relative flex items-center gap-2.5 rounded-lg transition-all duration-200 group/item",
					"hover:bg-gradient-to-r hover:from-primary/10 hover:via-primary/6 hover:to-primary/4",
					"hover:shadow-md hover:shadow-primary/15 hover:-translate-y-0.5",
					"border border-border/20 hover:border-primary/30",
					isActive && "bg-gradient-to-r from-primary/15 via-primary/10 to-primary/8 border-primary/40 shadow-md shadow-primary/20",
					isCompact ? "p-2" : "p-2.5 md:p-3"
				)}
			>
				{/* Active indicator */}
				{isActive && (
					<motion.div
						className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-primary/60 rounded-l-full"
						layoutId="activeMegaMenuItem"
						transition={{ type: "spring", stiffness: 380, damping: 30 }}
					/>
				)}
				
				<motion.div
					whileHover={{ scale: 1.08, rotate: 3 }}
					className={cn(
						"relative rounded-lg transition-all duration-200 flex-shrink-0",
						"bg-gradient-to-br from-accent/50 via-accent/35 to-accent/25",
						"group-hover/item:from-primary/20 group-hover/item:via-primary/15 group-hover/item:to-primary/10",
						"shadow-sm group-hover/item:shadow-md group-hover/item:shadow-primary/15",
						"border border-border/15 group-hover/item:border-primary/25",
						isActive && "from-primary/30 via-primary/20 to-primary/15 shadow-md shadow-primary/20 border-primary/35",
						isCompact ? "p-1.5" : "p-2"
					)}
				>
					<span className={cn(
						"text-muted-foreground transition-all duration-200 block",
						"group-hover/item:text-primary",
						isActive && "text-primary",
						isCompact ? "h-3 w-3" : "h-3.5 w-3.5"
					)}>
						{item.icon}
					</span>
				</motion.div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className={cn(
							"font-medium leading-tight transition-colors",
							"group-hover/item:text-primary",
							isActive && "text-primary",
							isCompact ? "text-xs md:text-sm" : "text-sm md:text-base"
						)}>
							{item.label}
						</span>
						{item.badge && (
							<motion.span 
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ delay: delay + 0.1, type: "spring", stiffness: 200 }}
								className={cn(
									"bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground rounded-full font-bold whitespace-nowrap shadow-sm shadow-primary/20 transition-all",
									isCompact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
								)}
							>
								{item.badge}
							</motion.span>
						)}
					</div>
					{item.description && !isCompact && (
						<span className={cn(
							"text-muted-foreground line-clamp-1 leading-snug group-hover/item:text-foreground/80 transition-colors duration-200",
							"text-xs md:text-sm mt-0.5"
						)}>
							{item.description}
						</span>
					)}
				</div>
			</Link>
		</motion.div>
	);
}


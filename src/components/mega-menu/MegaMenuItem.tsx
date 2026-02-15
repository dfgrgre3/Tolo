"use client";

import React, { useMemo, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NavItem } from "./types";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface MegaMenuItemProps {
	item: NavItem;
	isActive: boolean;
	onClick: () => void;
	delay?: number;
	isCompact?: boolean;
	searchQuery?: string;
	isFocused?: boolean;
}

// Helper function to highlight search matches (supports Arabic)
function highlightText(text: string, query: string) {
	if (!query.trim()) return text;
	
	// Escape special regex characters in query
	const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`(${escapedQuery})`, "gi");
	const parts = text.split(regex);
	
	return parts.map((part, index) => {
		// Check if this part matches the query (case-insensitive)
		const queryLower = query.toLowerCase();
		const partLower = part.toLowerCase();
		const isMatch = partLower === queryLower && part.length > 0;
		
		return isMatch ? (
			<span 
				key={index} 
				className="bg-primary/25 text-primary font-semibold rounded px-0.5 ring-1 ring-primary/30"
			>
				{part}
			</span>
		) : (
			<span key={index}>{part}</span>
		);
	});
}

export const MegaMenuItem = memo(function MegaMenuItem({ 
	item, 
	isActive, 
	onClick, 
	delay = 0, 
	isCompact = false,
	searchQuery = "",
	isFocused = false
}: MegaMenuItemProps) {
	const itemRef = useRef<HTMLAnchorElement>(null);

	const hasSearchMatch = useMemo(() => {
		if (!searchQuery.trim()) return false;
		const query = searchQuery.toLowerCase();
		return item.label.toLowerCase().includes(query) || 
		       item.description?.toLowerCase().includes(query) ||
		       item.href.toLowerCase().includes(query);
	}, [item.label, item.description, item.href, searchQuery]);

	// Check if it's an external link
	const isExternalLink = item.href?.startsWith('http') || item.href?.startsWith('//');

	// Scroll into view when focused
	useEffect(() => {
		if (isFocused && itemRef.current) {
			itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			itemRef.current.focus();
		}
	}, [isFocused]);

	return (
		<motion.div
			initial={{ opacity: 0, x: -8, scale: 0.96 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			transition={{ 
				delay, 
				duration: 0.3, 
				ease: [0.22, 1, 0.36, 1] 
			}}
			whileHover={{ scale: 1.02, x: 2 }}
			whileTap={{ scale: 0.98 }}
			role="listitem"
		>
		<Link
			ref={itemRef}
			href={item.href}
			onClick={onClick}
			target={isExternalLink ? "_blank" : undefined}
			rel={isExternalLink ? "noopener noreferrer" : undefined}
			className={cn(
				"relative flex items-center gap-2.5 rounded-xl transition-all duration-300 group/item overflow-hidden",
				"hover:bg-gradient-to-r hover:from-primary/12 hover:via-primary/8 hover:to-primary/6",
				"hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5",
				"border border-border/30 hover:border-primary/40",
				"backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
				isActive && "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 border-primary/50 shadow-lg shadow-primary/25",
				hasSearchMatch && !isActive && "bg-gradient-to-r from-primary/8 via-primary/5 to-primary/8 border-primary/30",
				isFocused && !isActive && "bg-gradient-to-r from-primary/10 via-primary/6 to-primary/10 border-primary/40 ring-2 ring-primary/40",
				isCompact ? "p-2" : "p-2.5 md:p-3"
			)}
			aria-current={isActive ? "page" : undefined}
		>
				{/* Animated background glow */}
				<motion.div
					className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 blur-xl"
					initial={false}
				/>

				{/* Active indicator */}
				{isActive && (
					<motion.div
						className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/80 to-primary/60 rounded-l-full"
						layoutId="activeMegaMenuItem"
						transition={{ type: "spring", stiffness: 380, damping: 30 }}
					/>
				)}

				{/* Search match indicator */}
				{hasSearchMatch && !isActive && (
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: 3 }}
						className="absolute right-0 top-0 bottom-0 bg-primary/40 rounded-l-full"
					/>
				)}

				{/* Focus indicator */}
				{isFocused && !isActive && (
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: 4 }}
						className="absolute right-0 top-0 bottom-0 bg-primary/60 rounded-l-full"
					/>
				)}
				
				{/* Icon container with enhanced animations */}
				<motion.div
					whileHover={{ scale: 1.12, rotate: [0, -8] }}
					whileTap={{ scale: 0.9 }}
					transition={{
						scale: { type: "spring", stiffness: 400, damping: 17 },
						rotate: { type: "tween", duration: 0.3, ease: "easeInOut" }
					}}
					className={cn(
						"relative rounded-xl transition-all duration-300 flex-shrink-0 z-10",
						"bg-gradient-to-br from-accent/60 via-accent/40 to-accent/30",
						"group-hover/item:from-primary/25 group-hover/item:via-primary/18 group-hover/item:to-primary/12",
						"shadow-md group-hover/item:shadow-lg group-hover/item:shadow-primary/20",
						"border border-border/20 group-hover/item:border-primary/30",
						isActive && "from-primary/35 via-primary/25 to-primary/18 shadow-lg shadow-primary/25 border-primary/40",
						hasSearchMatch && !isActive && "from-primary/20 via-primary/15 to-primary/10 border-primary/25",
						isFocused && !isActive && "from-primary/25 via-primary/18 to-primary/12 border-primary/35",
						isCompact ? "p-1.5" : "p-2"
					)}
				>
					<motion.div
						animate={isActive ? { 
							rotate: [0, 360],
							scale: [1, 1.1, 1]
						} : {}}
						transition={{ 
							duration: 2, 
							repeat: isActive ? Infinity : 0,
							repeatDelay: 3,
							type: "tween",
							ease: "easeInOut"
						}}
					className={cn(
						"text-muted-foreground transition-all duration-300 block",
						"group-hover/item:text-primary",
						isActive && "text-primary",
						hasSearchMatch && !isActive && "text-primary/90",
						isFocused && !isActive && "text-primary",
						isCompact ? "h-3 w-3" : "h-3.5 w-3.5"
					)}
				>
						<item.icon className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
					</motion.div>
				</motion.div>

				{/* Content */}
				<div className="flex-1 min-w-0 z-10">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className={cn(
							"font-semibold leading-tight transition-colors duration-300",
							"group-hover/item:text-primary",
							isActive && "text-primary",
							hasSearchMatch && !isActive && "text-primary/90",
							isFocused && !isActive && "text-primary",
							isCompact ? "text-xs md:text-sm" : "text-sm md:text-base"
						)}>
							{searchQuery ? highlightText(item.label, searchQuery) : item.label}
						</span>
						
						{/* Badge */}
						{item.badge && (
							<motion.span 
								initial={{ scale: 0, rotate: -180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ 
									delay: delay + 0.15, 
									type: "spring", 
									stiffness: 200,
									damping: 15
								}}
								className={cn(
									"bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground rounded-full font-bold whitespace-nowrap shadow-md shadow-primary/30 transition-all",
									"group-hover/item:shadow-lg group-hover/item:scale-110",
									isCompact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
								)}
							>
								{item.badge}
							</motion.span>
						)}

						{/* External link indicator */}
						{isExternalLink && (
							<ExternalLink className={cn(
								"text-muted-foreground/50 group-hover/item:text-primary/50 transition-colors",
								isCompact ? "h-3 w-3" : "h-3.5 w-3.5"
							)} />
						)}
					</div>
					
					{/* Description */}
					{item.description && !isCompact && (
						<span className={cn(
							"text-muted-foreground line-clamp-1 leading-snug transition-colors duration-300",
							"group-hover/item:text-foreground/90",
							isActive && "text-foreground/80",
							hasSearchMatch && !isActive && "text-foreground/70",
							isFocused && !isActive && "text-foreground/80",
							"text-xs md:text-sm mt-0.5"
						)}>
							{searchQuery ? highlightText(item.description || "", searchQuery) : item.description}
						</span>
					)}
				</div>

				{/* Hover arrow indicator */}
				<motion.div
					initial={{ opacity: 0, x: 5 }}
					animate={isFocused || isActive ? { opacity: 1, x: 0 } : {}}
					whileHover={{ opacity: 1, x: 0 }}
					className={cn(
						"text-primary/40 group-hover/item:text-primary/70 transition-colors z-10",
						isFocused && "text-primary/70",
						isActive && "text-primary"
					)}
				>
					<ArrowLeft className={cn(
						"transition-transform group-hover/item:-translate-x-1",
						isCompact ? "h-3 w-3" : "h-4 w-4"
					)} />
				</motion.div>
			</Link>
		</motion.div>
	);
});

MegaMenuItem.displayName = "MegaMenuItem";

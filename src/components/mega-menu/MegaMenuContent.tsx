"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { X, Search, Filter, Sparkles, TrendingUp, Command, Zap, ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import type { MegaMenuProps } from "./types";
import { MegaMenuCategory } from "./MegaMenuCategory";
import { cn } from "@/lib/utils";

import { logger } from '@/lib/logger';

export function MegaMenuContent({ 
	categories, 
	isOpen, 
	onClose, 
	activeRoute,
	user
}: MegaMenuProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [notificationCount, setNotificationCount] = useState(0);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// Fetch notification count for authenticated users
	useEffect(() => {
		if (!user) {
			setNotificationCount(0);
			return;
		}
		
		fetch("/api/notifications/unread-count")
			.then(async (res) => {
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				}
				const data = await res.json();
				if (data.count !== undefined) {
					setNotificationCount(data.count);
				}
			})
			.catch((error) => {
				logger.debug("Failed to fetch notification count:", error);
				setNotificationCount(0);
			});
	}, [user]);
	
	// Mouse tracking for interactive effects
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);
	const springConfig = { damping: 25, stiffness: 200 };
	const mouseXSpring = useSpring(mouseX, springConfig);
	const mouseYSpring = useSpring(mouseY, springConfig);

	// Filter categories and items based on search
	const filteredCategories = useMemo(() => {
		if (!searchQuery.trim()) return categories;

		const query = searchQuery.toLowerCase().trim();
		return categories
			.map(category => ({
				...category,
				items: category.items.filter(item =>
					item.label.toLowerCase().includes(query) ||
					item.description?.toLowerCase().includes(query) ||
					item.href.toLowerCase().includes(query)
				)
			}))
			.filter(category => category.items.length > 0);
	}, [categories, searchQuery]);

	// Keyboard navigation support
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "/" && !isSearchFocused) {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isSearchFocused]);

	// Auto-focus search on open
	useEffect(() => {
		if (isOpen && searchInputRef.current) {
			setTimeout(() => searchInputRef.current?.focus(), 100);
		}
	}, [isOpen]);

	// Mouse tracking for interactive glow effect
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!menuRef.current) return;
			const rect = menuRef.current.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			mouseX.set(x);
			mouseY.set(y);
			setMousePosition({ x, y });
		};

		if (isOpen && menuRef.current) {
			window.addEventListener("mousemove", handleMouseMove);
			return () => window.removeEventListener("mousemove", handleMouseMove);
		}
	}, [isOpen, mouseX, mouseY]);

	if (!isOpen) return null;

	// Calculate optimal grid columns based on number of categories
	const gridCols = useMemo(() => {
		const count = filteredCategories.length;
		if (count === 1) return "grid-cols-1";
		if (count === 2) return "sm:grid-cols-2";
		if (count === 3) return "sm:grid-cols-2 md:grid-cols-3";
		if (count === 4) return "sm:grid-cols-2 md:grid-cols-4";
		if (count === 5) return "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
		return "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
	}, [filteredCategories.length]);

	// Calculate total items count for dynamic sizing
	const totalItems = useMemo(() => {
		return filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
	}, [filteredCategories]);

	// Determine if we need compact mode (many items)
	const isCompact = totalItems > 15;

	const hasSearchResults = searchQuery.trim() && filteredCategories.length > 0;
	const hasNoResults = searchQuery.trim() && filteredCategories.length === 0;

	return (
		<>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.3 }}
				className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 backdrop-blur-xl z-40"
				onClick={onClose}
			/>
			<motion.div
				ref={menuRef}
				initial={{ opacity: 0, y: -30, scale: 0.95, filter: "blur(10px)" }}
				animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
				exit={{ opacity: 0, y: -30, scale: 0.95, filter: "blur(10px)" }}
				transition={{ 
					type: "spring",
					stiffness: 500,
					damping: 40,
					mass: 0.8
				}}
				className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-[110vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl z-50 overflow-hidden"
				onMouseEnter={() => {}}
				onMouseLeave={onClose}
				data-mega-menu-content
				suppressHydrationWarning
			>
				{/* Advanced glassmorphism container */}
				<div className="relative bg-gradient-to-br from-popover/98 via-popover/95 to-popover/98 backdrop-blur-2xl rounded-b-3xl border border-border/60 shadow-2xl shadow-black/50 overflow-hidden">
					{/* Animated mesh gradient background */}
					<div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/5 via-primary/8 to-primary/12 pointer-events-none" />
					
					{/* Animated gradient overlay with smooth movement */}
					<motion.div
						className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 pointer-events-none"
						animate={{
							backgroundPosition: ["0% 0%", "100% 100%"],
							opacity: [0.6, 0.8, 0.6],
						}}
						transition={{
							duration: 10,
							repeat: Infinity,
							repeatType: "reverse",
							ease: "easeInOut"
						}}
					/>
					
					{/* Interactive mouse glow effect */}
					<motion.div
						className="absolute pointer-events-none"
						style={{
							left: mouseXSpring,
							top: mouseYSpring,
							translateX: "-50%",
							translateY: "-50%",
							opacity: 0.3,
						}}
					>
						<div className="w-96 h-96 bg-gradient-radial from-primary/40 via-primary/20 to-transparent rounded-full blur-3xl" />
					</motion.div>
					
					{/* Shimmer effect */}
					<motion.div
						className="absolute inset-0 -translate-x-full pointer-events-none"
						animate={{
							translateX: ["-100%", "200%"],
						}}
						transition={{
							duration: 3,
							repeat: Infinity,
							repeatDelay: 2,
							ease: "linear"
						}}
					>
						<div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
					</motion.div>
					
					{/* Enhanced header with search */}
					<div className="relative border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/6 to-primary/10 backdrop-blur-md">
						{/* Header glow effect */}
						<div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
						
						<div className="relative flex items-center gap-3 px-4 md:px-6 py-4">
							{/* Search bar with enhanced design */}
							<div className="flex-1 relative group/search">
								{/* Search icon with animation */}
								<motion.div
									animate={isSearchFocused ? { scale: [1, 1.2, 1], rotate: [0, 10] } : {}}
									transition={{ 
										duration: 0.5,
										type: "tween",
										ease: "easeInOut"
									}}
								>
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary transition-all duration-300 z-10" />
								</motion.div>
								
								{/* Search input with glassmorphism */}
								<Input
									ref={searchInputRef}
									type="text"
									placeholder="ابحث في القائمة... (اضغط / للبحث)"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onFocus={() => setIsSearchFocused(true)}
									onBlur={() => setIsSearchFocused(false)}
									className={cn(
										"w-full pl-10 pr-10 py-2.5",
										"bg-background/90 backdrop-blur-md border-border/60",
										"focus:border-primary/60 focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background",
										"transition-all duration-300 shadow-sm",
										isSearchFocused && "border-primary/70 ring-2 ring-primary/40 shadow-lg shadow-primary/20"
									)}
								/>
								
								{/* Search shortcut hint */}
								{!searchQuery && !isSearchFocused && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50"
									>
										<Command className="h-3 w-3 text-muted-foreground" />
										<kbd className="text-[10px] font-mono text-muted-foreground">/</kbd>
									</motion.div>
								)}
								
								{/* Clear button */}
								{searchQuery && (
									<motion.button
										initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
										animate={{ opacity: 1, scale: 1, rotate: 0 }}
										exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
										whileHover={{ scale: 1.1, rotate: 90 }}
										whileTap={{ scale: 0.9 }}
										onClick={() => setSearchQuery("")}
										className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 hover:from-destructive/30 hover:to-destructive/20 text-destructive transition-all duration-200 flex items-center justify-center border border-destructive/30"
									>
										<X className="h-3 w-3" />
									</motion.button>
								)}
							</div>
							
							{/* Search results indicator with enhanced design */}
							{hasSearchResults && (
								<motion.div
									initial={{ opacity: 0, x: -10, scale: 0.9 }}
									animate={{ opacity: 1, x: 0, scale: 1 }}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 text-primary text-sm font-semibold border border-primary/30 shadow-sm backdrop-blur-sm"
								>
									<motion.div
										animate={{ rotate: [0, 360] }}
										transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
									>
										<Zap className="h-3.5 w-3.5" />
									</motion.div>
									<span>{totalItems} نتيجة</span>
								</motion.div>
							)}

							{/* Notifications button - only show for authenticated users */}
							{user && (
								<Link
									href="/notifications"
									onClick={onClose}
									className="relative h-10 w-10 rounded-xl hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:text-primary transition-all duration-300 hover:scale-110 active:scale-95 border border-transparent hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20 flex items-center justify-center"
									aria-label="الإشعارات"
								>
									<motion.div
										whileHover={{ rotate: 12, scale: 1.1 }}
										transition={{ duration: 0.3 }}
									>
										<Bell className="h-4 w-4" />
									</motion.div>
									{notificationCount > 0 && (
										<motion.span
											initial={false}
											animate={{ scale: 1 }}
											style={{ transform: 'none' }}
											className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-destructive via-destructive to-destructive/80 text-destructive-foreground text-[10px] font-bold shadow-lg ring-2 ring-background"
											suppressHydrationWarning
										>
											{notificationCount > 9 ? "9+" : notificationCount}
										</motion.span>
									)}
								</Link>
							)}

							{/* Close button with enhanced design */}
							<Button
								variant="ghost"
								size="icon"
								onClick={onClose}
								className="h-10 w-10 rounded-xl hover:bg-gradient-to-br hover:from-destructive/20 hover:to-destructive/10 hover:text-destructive transition-all duration-300 hover:scale-110 active:scale-95 border border-transparent hover:border-destructive/30 hover:shadow-lg hover:shadow-destructive/20"
								aria-label="إغلاق القائمة"
							>
								<motion.div
									whileHover={{ rotate: 90 }}
									transition={{ duration: 0.3 }}
								>
									<X className="h-4 w-4" />
								</motion.div>
							</Button>
						</div>
					</div>

					{/* Content section - dynamic sizing with enhanced scrollbar */}
					<div className={cn(
						"relative overflow-y-auto",
						"scrollbar-thin scrollbar-thumb-primary/30 scrollbar-thumb-rounded-full",
						"scrollbar-track-transparent hover:scrollbar-thumb-primary/40",
						isCompact ? 'max-h-[70vh]' : 'max-h-[80vh]'
					)}>
						<AnimatePresence mode="wait">
							{hasNoResults ? (
								<motion.div
									key="no-results"
									initial={{ opacity: 0, y: 20, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: -20, scale: 0.95 }}
									transition={{ type: "spring", stiffness: 300, damping: 30 }}
									className="flex flex-col items-center justify-center py-20 px-4"
								>
									<motion.div
										animate={{ 
											rotate: [0, 10, -10, 0],
											scale: [1, 1.1, 1]
										}}
										transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
										className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60 border border-border/50 shadow-lg"
									>
										<Search className="h-10 w-10 text-muted-foreground" />
									</motion.div>
									<motion.h3
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.2 }}
										className="text-xl font-bold text-foreground mb-2"
									>
										لا توجد نتائج
									</motion.h3>
									<motion.p
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.3 }}
										className="text-sm text-muted-foreground text-center max-w-md leading-relaxed"
									>
										لم نجد أي عناصر تطابق <span className="font-semibold text-primary">"{searchQuery}"</span>. جرب كلمات مفتاحية مختلفة أو ابحث بطريقة أخرى.
									</motion.p>
								</motion.div>
							) : (
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
										{filteredCategories.map((category, categoryIndex) => (
											<MegaMenuCategory
												key={`${category.title}-${categoryIndex}`}
												category={category}
												categoryIndex={categoryIndex}
												onItemClick={onClose}
												activeRoute={activeRoute}
												isCompact={isCompact}
												searchQuery={searchQuery}
											/>
										))}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Footer with quick stats - enhanced design */}
					{!searchQuery && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
							className="relative border-t border-border/50 bg-gradient-to-r from-primary/8 via-primary/4 to-primary/8 backdrop-blur-md px-4 md:px-6 py-3"
						>
							{/* Footer glow */}
							<div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50" />
							
							<div className="relative flex items-center justify-between text-xs text-muted-foreground">
								<div className="flex items-center gap-5">
									<motion.div
										whileHover={{ scale: 1.05 }}
										className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20"
									>
										<motion.div
											animate={{ rotate: [0, 360] }}
											transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
										>
											<Sparkles className="h-3.5 w-3.5 text-primary" />
										</motion.div>
										<span className="font-semibold text-primary">{categories.length} فئة</span>
									</motion.div>
									<motion.div
										whileHover={{ scale: 1.05 }}
										className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20"
									>
										<TrendingUp className="h-3.5 w-3.5 text-primary" />
										<span className="font-semibold text-primary">{totalItems} عنصر</span>
									</motion.div>
								</div>
								<motion.div
									whileHover={{ scale: 1.05 }}
									className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background/60 border border-border/50 backdrop-blur-sm"
								>
									<kbd className="px-2 py-1 rounded-md bg-background/80 border border-border/60 text-[10px] font-mono font-semibold shadow-sm">
										ESC
									</kbd>
									<span className="font-medium">للإغلاق</span>
								</motion.div>
							</div>
						</motion.div>
					)}
				</div>
			</motion.div>
		</>
	);
}

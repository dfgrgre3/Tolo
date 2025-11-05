"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/UserProvider";
import {
	Search,
	Bell,
	User,
	Menu,
	X,
	Settings,
	LogOut,
	LogIn,
	ChevronDown,
	GraduationCap,
	Command,
	Circle,
	Zap,
	BookOpen,
	Clock,
	TrendingUp,
	Activity,
	HelpCircle,
} from "lucide-react";
import { Button } from "@/shared/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { MegaMenu } from "@/components/mega-menu";
import { mainNavItemsWithMegaMenu, moreMegaMenu } from "@/components/mega-menu/navData";
import type { NavItemWithMegaMenu } from "@/components/mega-menu/navData";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Header() {
	const pathname = usePathname();
	const router = useRouter();
	const { user, logout, isLoading } = useAuth();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [notificationCount, setNotificationCount] = useState(0);
	const [notifications, setNotifications] = useState<any[]>([]);
	const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
	const [isNotificationOpen, setIsNotificationOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const mobileMenuRef = useRef<HTMLDivElement>(null);
	const notificationRef = useRef<HTMLDivElement>(null);

	// Handle mount to prevent hydration mismatch
	// Use startTransition to avoid blocking render
	useEffect(() => {
		// Use requestAnimationFrame to ensure this runs after initial render
		requestAnimationFrame(() => {
			setMounted(true);
		});
	}, []);

	// Handle scroll effect
	useEffect(() => {
		if (!mounted) return;
		
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		
		// Set initial scroll state
		handleScroll();
		
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [mounted]);

	// Fetch notification count and recent notifications
	useEffect(() => {
		if (!mounted || !user) return;
		
		// Fetch notification count
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
				console.debug("Failed to fetch notification count:", error);
				setNotificationCount(0);
			});

		// Fetch recent notifications
		fetch("/api/notifications?limit=5")
			.then(async (res) => {
				if (res.ok) {
					const data = await res.json();
					if (Array.isArray(data)) {
						setNotifications(data);
					}
				}
			})
			.catch((error) => {
				console.debug("Failed to fetch notifications:", error);
			});
	}, [user, mounted]);

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false);
		setOpenMegaMenu(null);
	}, [pathname]);

	// Close mobile menu when clicking outside
	useEffect(() => {
		if (!mounted || !isMobileMenuOpen) return;
		
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				mobileMenuRef.current &&
				!mobileMenuRef.current.contains(target) &&
				!target?.closest?.("[data-mobile-menu-trigger]")
			) {
				setIsMobileMenuOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMobileMenuOpen, mounted]);

	// Close mega menu when clicking outside
	useEffect(() => {
		if (!mounted || !openMegaMenu) return;
		
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target?.closest?.("[data-mega-menu-trigger]") && !target?.closest?.("[data-mega-menu-content]")) {
				setOpenMegaMenu(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [openMegaMenu, mounted]);

	// Close notification dropdown when clicking outside
	useEffect(() => {
		if (!mounted || !isNotificationOpen) return;
		
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				notificationRef.current &&
				!notificationRef.current.contains(target) &&
				!target?.closest?.("[data-notification-trigger]")
			) {
				setIsNotificationOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isNotificationOpen, mounted]);

	// Search suggestions handler
	useEffect(() => {
		if (!searchQuery.trim() || !mounted) {
			setShowSearchSuggestions(false);
			return;
		}

		// Simple search suggestions - يمكن استبدالها بـ API call
		const suggestions = [
			"دورات رياضيات",
			"دروس فيزياء",
			"امتحانات",
			"جدول دراسي",
		].filter(item => item.includes(searchQuery));

		setSearchSuggestions(suggestions.slice(0, 5));
		setShowSearchSuggestions(suggestions.length > 0);
	}, [searchQuery, mounted]);

	// Focus search input when opened
	useEffect(() => {
		if (!mounted || !isSearchOpen || !searchInputRef.current) return;
		
		const timer = setTimeout(() => {
			searchInputRef.current?.focus();
		}, 100);
		
		return () => clearTimeout(timer);
	}, [isSearchOpen, mounted]);

	// Keyboard shortcuts (Ctrl+K / Cmd+K)
	useEffect(() => {
		if (!mounted) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Check if Ctrl+K (Windows/Linux) or Cmd+K (Mac) is pressed
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setIsSearchOpen(true);
			}
			// Close search on Escape
			if (e.key === "Escape" && isSearchOpen) {
				setIsSearchOpen(false);
				setSearchQuery("");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [mounted, isSearchOpen]);

	const handleSearch = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
			setIsSearchOpen(false);
			setSearchQuery("");
		}
	}, [searchQuery, router]);

	const handleLogout = useCallback(async () => {
		try {
			await logout();
			router.push("/");
		} catch (error) {
			console.error("Logout error:", error);
		}
	}, [logout, router]);

	const isActiveRoute = useCallback((href: string) => {
		if (href === "/") {
			return pathname === "/";
		}
		return pathname.startsWith(href);
	}, [pathname]);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 w-full border-b transition-all duration-500",
				// Enhanced glassmorphism effect
				"bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70",
				// Only apply scroll effect after hydration to prevent mismatch
				mounted && isScrolled && "shadow-xl shadow-black/10 dark:shadow-black/30 border-b-border/50",
				// Enhanced visual indicator for authenticated users
				user && "border-primary/20 dark:border-primary/30 bg-gradient-to-r from-primary/5 via-background/80 to-primary/5 dark:from-primary/10 dark:via-background/70 dark:to-primary/10 shadow-primary/10"
			)}
			suppressHydrationWarning
		>
			<div className="container mx-auto px-4">
				<div className="flex h-16 items-center justify-between gap-4">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-3 group" suppressHydrationWarning>
						<motion.div 
							className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30"
							whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
							whileTap={{ scale: 0.95 }}
							transition={{ type: "spring", stiffness: 400, damping: 17 }}
						>
							<GraduationCap className="h-5 w-5 relative z-10" />
							<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
							<div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						</motion.div>
						<div className="flex flex-col">
							<span className="font-bold text-lg leading-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text transition-all group-hover:scale-105 inline-block group-hover:from-primary group-hover:via-primary/90 group-hover:to-primary/80">
								ثانوية بذكاء
							</span>
							<span className="text-xs text-muted-foreground leading-tight hidden sm:block opacity-80 group-hover:opacity-100 transition-opacity">
								ThanaWy Smart
							</span>
						</div>
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
						{mainNavItemsWithMegaMenu.map((item) => {
							const menuKey = item.href;
							const isOpen = openMegaMenu === menuKey;
							
							if (item.megaMenu && item.megaMenu.length > 0) {
								return (
									<div key={item.href} className="relative group">
										<MegaMenu
											categories={item.megaMenu}
											isOpen={isOpen}
											onClose={() => setOpenMegaMenu(null)}
											onOpen={() => {
												// Close other menus when opening this one
												setOpenMegaMenu(menuKey);
											}}
											activeRoute={isActiveRoute}
											label={item.label}
											className={cn(
												"relative flex items-center gap-2 px-4 py-2.5 transition-all duration-300",
												"hover:bg-accent/80 hover:text-accent-foreground",
												isActiveRoute(item.href) && "bg-primary/10 text-primary font-semibold shadow-sm",
												isOpen && "bg-primary/15 text-primary shadow-sm"
											)}
										/>
										{item.badge && (
											<span className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse z-10">
												{item.badge}
											</span>
										)}
										{isActiveRoute(item.href) && !isOpen && (
											<motion.div
												className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
												layoutId={`activeIndicator-${item.href}`}
												initial={false}
												transition={{ type: "spring", stiffness: 380, damping: 30 }}
											/>
										)}
									</div>
								);
							}
							
							return (
								<motion.div
									key={item.href}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<Link
										href={item.href}
										className={cn(
											"relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-accent/80 hover:text-accent-foreground group/nav",
											isActiveRoute(item.href) &&
												"bg-primary/10 text-primary font-semibold shadow-sm"
										)}
									>
										<span className={cn(
											"transition-transform duration-300",
											"group-hover/nav:scale-110 group-hover/nav:rotate-3",
											isActiveRoute(item.href) && "text-primary"
										)}>
											{item.icon}
										</span>
										<span className="relative">{item.label}</span>
										{item.badge && (
											<motion.span
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse"
											>
												{item.badge}
											</motion.span>
										)}
										{isActiveRoute(item.href) && (
											<motion.div
												className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
												layoutId={`activeIndicator-${item.href}`}
												initial={false}
												transition={{ type: "spring", stiffness: 380, damping: 30 }}
											/>
										)}
									</Link>
								</motion.div>
							);
						})}

						{/* More Mega Menu */}
						<MegaMenu
							categories={moreMegaMenu}
							isOpen={openMegaMenu === "more"}
							onClose={() => setOpenMegaMenu(null)}
							onOpen={() => {
								// Close other menus when opening this one
								setOpenMegaMenu("more");
							}}
							activeRoute={isActiveRoute}
							label="المزيد"
						/>
					</nav>

					{/* Right Side Actions */}
					<div className="flex items-center gap-2">
						{/* Search */}
						<AnimatePresence>
							{isSearchOpen ? (
								<motion.form
									initial={{ width: 0, opacity: 0 }}
									animate={{ width: "auto", opacity: 1 }}
									exit={{ width: 0, opacity: 0 }}
									transition={{ duration: 0.25, ease: "easeInOut" }}
									onSubmit={handleSearch}
									className="hidden md:flex items-center gap-2"
								>
									<motion.div
										initial={{ scale: 0.9 }}
										animate={{ scale: 1 }}
										className="relative"
									>
										<Input
											ref={searchInputRef}
											type="text"
											placeholder="بحث..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											onFocus={() => setShowSearchSuggestions(searchQuery.trim().length > 0 && searchSuggestions.length > 0)}
											className="w-72 pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 bg-background/90 backdrop-blur-sm border-border/50"
											onBlur={() => {
												setTimeout(() => {
													setShowSearchSuggestions(false);
													if (!searchQuery) {
														setIsSearchOpen(false);
													}
												}, 200);
											}}
										/>
										<span className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">
											<Command className="h-3 w-3" />
											<span className="hidden lg:inline">K</span>
										</span>
										{/* Search Suggestions */}
										{showSearchSuggestions && searchSuggestions.length > 0 && (
											<motion.div
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
												className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
											>
												{searchSuggestions.map((suggestion, index) => (
													<button
														key={index}
														type="button"
														onClick={() => {
															setSearchQuery(suggestion);
															setShowSearchSuggestions(false);
															searchInputRef.current?.focus();
														}}
														className="w-full text-right px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2"
													>
														<Search className="h-3 w-3 text-muted-foreground" />
														<span className="text-sm">{suggestion}</span>
													</button>
												))}
											</motion.div>
										)}
									</motion.div>
									<Button type="submit" size="icon" variant="ghost" className="hover:bg-primary/10 hover:text-primary transition-all duration-300 shadow-sm">
										<Search className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										onClick={() => {
											setIsSearchOpen(false);
											setSearchQuery("");
										}}
										className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
									>
										<X className="h-4 w-4" />
									</Button>
								</motion.form>
							) : (
								<motion.div
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setIsSearchOpen(true)}
										className="hidden md:flex hover:bg-primary/10 hover:text-primary transition-all duration-300 relative group"
										title="بحث (Ctrl+K / Cmd+K)"
									>
										<Search className="h-4 w-4" />
										<span className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
											<Command className="h-2.5 w-2.5" />
											<span className="hidden lg:inline">K</span>
										</span>
									</Button>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Theme Toggle */}
						{mounted && (
							<div className="hidden md:flex" suppressHydrationWarning>
								<ThemeToggle />
							</div>
						)}

						{/* Notifications Dropdown */}
						{mounted && user && (
							<div className="relative" ref={notificationRef}>
								<motion.div
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setIsNotificationOpen(!isNotificationOpen)}
										data-notification-trigger
										className="relative hover:bg-primary/10 hover:text-primary transition-all duration-300 group"
									>
										<Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />
										{notificationCount > 0 && (
											<motion.span
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-destructive via-destructive to-destructive/80 text-destructive-foreground text-[10px] font-bold shadow-lg ring-2 ring-background"
											>
												{notificationCount > 9 ? "9+" : notificationCount}
											</motion.span>
										)}
									</Button>
								</motion.div>
								
								{/* Notifications Dropdown Content */}
								<AnimatePresence>
									{isNotificationOpen && (
										<motion.div
											initial={{ opacity: 0, y: -10, scale: 0.95 }}
											animate={{ opacity: 1, y: 0, scale: 1 }}
											exit={{ opacity: 0, y: -10, scale: 0.95 }}
											transition={{ duration: 0.2 }}
											className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col"
										>
											<div className="p-4 border-b border-border flex items-center justify-between">
												<h3 className="font-semibold text-sm">الإشعارات</h3>
												<Link
													href="/notifications"
													onClick={() => setIsNotificationOpen(false)}
													className="text-xs text-primary hover:underline"
												>
													عرض الكل
												</Link>
											</div>
											<div className="overflow-y-auto flex-1">
												{notifications.length > 0 ? (
													<div className="divide-y divide-border">
														{notifications.map((notification, index) => (
															<Link
																key={index}
																href={notification.link || "/notifications"}
																onClick={() => setIsNotificationOpen(false)}
																className="block p-4 hover:bg-accent transition-colors"
															>
																<div className="flex items-start gap-3">
																	<div className="flex-shrink-0 mt-1">
																		<div className="w-2 h-2 rounded-full bg-primary" />
																	</div>
																	<div className="flex-1 min-w-0">
																		<p className="text-sm font-medium truncate">
																			{notification.title || "إشعار جديد"}
																		</p>
																		<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
																			{notification.message || notification.description || ""}
																		</p>
																		{notification.time && (
																			<p className="text-xs text-muted-foreground mt-1">
																				{notification.time}
																			</p>
																		)}
																	</div>
																</div>
															</Link>
														))}
													</div>
												) : (
													<div className="p-8 text-center text-muted-foreground">
														<Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
														<p className="text-sm">لا توجد إشعارات جديدة</p>
													</div>
												)}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)}

						{/* User Menu / Login - Show user icon immediately when logged in */}
						{user ? (
							<motion.div
								key="user-menu"
								initial={{ opacity: 0, scale: 0.8, x: -10 }}
								animate={{ opacity: 1, scale: 1, x: 0 }}
								transition={{ duration: 0.3, ease: "easeOut" }}
								className="hidden md:flex"
							>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" className="flex items-center gap-2 h-auto p-1.5 hover:bg-primary/10 transition-all duration-300 group">
											<div className="relative">
												<Avatar className="h-9 w-9 border-2 border-primary/20 transition-all duration-300 group-hover:border-primary/40 group-hover:scale-105">
													<AvatarImage src={user.avatar} alt={user.name || "User"} />
													<AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
														{user.name
															?.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase() || user.email[0].toUpperCase()}
													</AvatarFallback>
												</Avatar>
												{/* Online Status Indicator */}
												<span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full shadow-sm" title="متصل" />
											</div>
											<span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
												{user.name || user.email}
											</span>
											<ChevronDown className="h-4 w-4 hidden md:block transition-transform duration-300 group-hover:rotate-180" />
										</Button>
									</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-72 p-2">
									<DropdownMenuLabel className="px-3 py-3">
										<div className="flex items-center gap-3">
											<div className="relative">
												<Avatar className="h-12 w-12 border-2 border-primary/20">
													<AvatarImage src={user.avatar} alt={user.name || "User"} />
													<AvatarFallback className="bg-gradient-to-br from-primary to-primary/80">
														{user.name
															?.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase() || user.email[0].toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-sm" />
											</div>
											<div className="flex flex-col space-y-1 flex-1 min-w-0">
												<p className="text-sm font-semibold leading-none truncate">
													{user.name || "مستخدم"}
												</p>
												<p className="text-xs leading-none text-muted-foreground truncate">
													{user.email}
												</p>
												<div className="flex items-center gap-2 mt-1">
													<span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
														<Circle className="h-2 w-2 fill-current" />
														متصل
													</span>
												</div>
											</div>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{/* Quick Actions */}
									<div className="p-2">
										<div className="grid grid-cols-2 gap-2">
											<DropdownMenuItem asChild>
												<Link href="/courses" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
													<BookOpen className="h-5 w-5 text-primary" />
													<span className="text-xs font-medium">دوراتي</span>
												</Link>
											</DropdownMenuItem>
											<DropdownMenuItem asChild>
												<Link href="/schedule" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
													<Clock className="h-5 w-5 text-primary" />
													<span className="text-xs font-medium">جدولي</span>
												</Link>
											</DropdownMenuItem>
											<DropdownMenuItem asChild>
												<Link href="/analytics" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
													<TrendingUp className="h-5 w-5 text-primary" />
													<span className="text-xs font-medium">إحصائيات</span>
												</Link>
											</DropdownMenuItem>
											<DropdownMenuItem asChild>
												<Link href="/help" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
													<HelpCircle className="h-5 w-5 text-primary" />
													<span className="text-xs font-medium">مساعدة</span>
												</Link>
											</DropdownMenuItem>
										</div>
									</div>
									<DropdownMenuSeparator />
									<div className="p-1 space-y-1">
										<DropdownMenuItem asChild>
											<Link href="/profile" className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
												<User className="h-4 w-4 text-muted-foreground" />
												<span>الملف الشخصي</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/settings" className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
												<Settings className="h-4 w-4 text-muted-foreground" />
												<span>الإعدادات</span>
											</Link>
										</DropdownMenuItem>
									</div>
									<DropdownMenuSeparator />
									<div className="p-1">
										<DropdownMenuItem
											onClick={handleLogout}
											className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg text-destructive focus:text-destructive hover:bg-destructive/10 transition-colors"
										>
											<LogOut className="h-4 w-4" />
											<span>تسجيل الخروج</span>
										</DropdownMenuItem>
									</div>
								</DropdownMenuContent>
							</DropdownMenu>
							</motion.div>
						) : (
							// Show login button only if user is not logged in
							<motion.div
								key="login-button"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.2 }}
								className="hidden md:flex"
							>
								<Button variant="default" asChild className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-300">
									<Link href="/login" className="flex items-center gap-2" suppressHydrationWarning>
										<LogIn className="h-4 w-4" />
										تسجيل الدخول
									</Link>
								</Button>
							</motion.div>
						)}

						{/* Mobile Menu Button */}
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden"
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							data-mobile-menu-trigger
						>
							{isMobileMenuOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
						</Button>
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			<AnimatePresence>
				{isMobileMenuOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 z-40 lg:hidden"
							onClick={() => setIsMobileMenuOpen(false)}
						/>
						<motion.div
							ref={mobileMenuRef}
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							className="fixed right-0 top-16 bottom-0 w-[85%] max-w-sm bg-background/95 backdrop-blur-xl border-l border-border/40 shadow-2xl z-50 overflow-y-auto lg:hidden"
						>
							<div className="p-4 space-y-3">
								{/* Mobile Search */}
								<form onSubmit={handleSearch} className="mb-4">
									<div className="flex gap-2">
										<Input
											type="text"
											placeholder="بحث..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="flex-1 focus:ring-2 focus:ring-primary/20 transition-all"
										/>
										<Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
											<Search className="h-4 w-4" />
										</Button>
									</div>
								</form>

								{/* Mobile Navigation */}
								<div className="space-y-2">
									{mainNavItemsWithMegaMenu.map((item) => (
										<Link
											key={item.href}
											href={item.href}
											onClick={() => setIsMobileMenuOpen(false)}
											className={cn(
												"flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group/mobile",
												isActiveRoute(item.href)
													? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm border border-primary/20"
													: "hover:bg-accent/80 active:scale-95"
											)}
										>
											<span className={cn(
												"transition-transform duration-300",
												isActiveRoute(item.href) ? "text-primary scale-110" : "group-hover/mobile:scale-110"
											)}>
												{item.icon}
											</span>
											<span className="flex-1">{item.label}</span>
											{item.badge && (
												<span className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
													{item.badge}
												</span>
											)}
										</Link>
									))}
									{moreMegaMenu.flatMap((category) => category.items).map((item) => (
										<Link
											key={item.href}
											href={item.href}
											onClick={() => setIsMobileMenuOpen(false)}
											className={cn(
												"flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group/mobile",
												isActiveRoute(item.href)
													? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm border border-primary/20"
													: "hover:bg-accent/80 active:scale-95"
											)}
										>
											<span className={cn(
												"transition-transform duration-300",
												isActiveRoute(item.href) ? "text-primary scale-110" : "group-hover/mobile:scale-110"
											)}>
												{item.icon}
											</span>
											<span className="flex-1">{item.label}</span>
											{item.badge && (
												<span className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
													{item.badge}
												</span>
											)}
										</Link>
									))}
								</div>

								{/* Mobile User Section */}
								<div className="pt-4 mt-4 border-t border-border/40">
									{user ? (
										<div className="space-y-2">
											<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-accent/50 to-accent/30 border border-border/50">
												<Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md">
													<AvatarImage src={user.avatar} alt={user.name || "User"} />
													<AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
														{user.name
															?.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase() || user.email[0].toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-semibold truncate">
														{user.name || "مستخدم"}
													</p>
													<p className="text-xs text-muted-foreground truncate">
														{user.email}
													</p>
												</div>
											</div>
											<Link
												href="/profile"
												onClick={() => setIsMobileMenuOpen(false)}
												className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm hover:bg-accent/80 transition-all duration-300 active:scale-95 group"
											>
												<User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
												<span>الملف الشخصي</span>
											</Link>
											<Link
												href="/settings"
												onClick={() => setIsMobileMenuOpen(false)}
												className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm hover:bg-accent/80 transition-all duration-300 active:scale-95 group"
											>
												<Settings className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
												<span>الإعدادات</span>
											</Link>
											{/* Theme Toggle in Mobile Menu */}
											<div className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm border border-border/50 bg-accent/30">
												<span className="text-muted-foreground">المظهر</span>
												<ThemeToggle />
											</div>
											<button
												onClick={() => {
													handleLogout();
													setIsMobileMenuOpen(false);
												}}
												className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm hover:bg-destructive/10 text-destructive transition-all duration-300 active:scale-95 group"
											>
												<LogOut className="h-4 w-4 group-hover:rotate-12 transition-transform" />
												<span>تسجيل الخروج</span>
											</button>
										</div>
									) : (
										<div className="space-y-3">
											<Button
												variant="default"
												className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-300"
												asChild
												onClick={() => setIsMobileMenuOpen(false)}
											>
												<Link href="/login" className="flex items-center justify-center gap-2" suppressHydrationWarning>
													<LogIn className="h-4 w-4" />
													تسجيل الدخول
												</Link>
											</Button>
											{/* Theme Toggle in Mobile Menu for non-authenticated users */}
											<div className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm border border-border/50 bg-accent/30">
												<span className="text-muted-foreground">المظهر</span>
												<ThemeToggle />
											</div>
										</div>
									)}
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</header>
	);
}


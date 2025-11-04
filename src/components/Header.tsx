"use client";

import React, { useState, useEffect, useRef } from "react";
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

export default function Header() {
	const pathname = usePathname();
	const router = useRouter();
	const { user, logout, isLoading } = useAuth();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [notificationCount, setNotificationCount] = useState(0);
	const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
	const [mounted, setMounted] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const mobileMenuRef = useRef<HTMLDivElement>(null);

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

	// Fetch notification count
	useEffect(() => {
		if (!mounted || !user) return;
		
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
				// Silent fail for notification count - don't show error to user
				console.debug("Failed to fetch notification count:", error);
				// Set to 0 as fallback
				setNotificationCount(0);
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

	// Focus search input when opened
	useEffect(() => {
		if (!mounted || !isSearchOpen || !searchInputRef.current) return;
		
		const timer = setTimeout(() => {
			searchInputRef.current?.focus();
		}, 100);
		
		return () => clearTimeout(timer);
	}, [isSearchOpen, mounted]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
			setIsSearchOpen(false);
			setSearchQuery("");
		}
	};

	const handleLogout = async () => {
		try {
			await logout();
			router.push("/");
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	const isActiveRoute = (href: string) => {
		if (href === "/") {
			return pathname === "/";
		}
		return pathname.startsWith(href);
	};

	return (
		<header
			className={cn(
				"sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 transition-all duration-300",
				// Only apply scroll effect after hydration to prevent mismatch
				mounted && isScrolled && "shadow-lg shadow-black/5 border-b-border/40"
			)}
			suppressHydrationWarning
		>
			<div className="container mx-auto px-4">
				<div className="flex h-16 items-center justify-between gap-4">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-3 group" suppressHydrationWarning>
						<div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
							<GraduationCap className="h-5 w-5" />
							<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
						</div>
						<div className="flex flex-col">
							<span className="font-bold text-lg leading-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text transition-all group-hover:scale-105 inline-block">
								ثانوية بذكاء
							</span>
							<span className="text-xs text-muted-foreground leading-tight hidden sm:block opacity-80">
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
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-accent/80 hover:text-accent-foreground group/nav",
										isActiveRoute(item.href) &&
											"bg-primary/10 text-primary font-semibold shadow-sm"
									)}
								>
									<span className={cn(
										"transition-transform duration-300",
										"group-hover/nav:scale-110",
										isActiveRoute(item.href) && "text-primary"
									)}>
										{item.icon}
									</span>
									<span className="relative">{item.label}</span>
									{item.badge && (
										<span className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse">
											{item.badge}
										</span>
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
									transition={{ duration: 0.2 }}
									onSubmit={handleSearch}
									className="hidden md:flex items-center gap-2"
								>
									<Input
										ref={searchInputRef}
										type="text"
										placeholder="بحث..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-64 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
										onBlur={() => {
											if (!searchQuery) {
												setIsSearchOpen(false);
											}
										}}
									/>
									<Button type="submit" size="icon" variant="ghost" className="hover:bg-primary/10 hover:text-primary transition-colors">
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
										className="hover:bg-destructive/10 hover:text-destructive transition-colors"
									>
										<X className="h-4 w-4" />
									</Button>
								</motion.form>
							) : (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsSearchOpen(true)}
									className="hidden md:flex hover:bg-primary/10 hover:text-primary transition-all duration-300"
								>
									<Search className="h-4 w-4" />
								</Button>
							)}
						</AnimatePresence>

						{/* Notifications */}
						{mounted && user && (
							<Link href="/notifications" suppressHydrationWarning>
								<Button variant="ghost" size="icon" className="relative hover:bg-primary/10 hover:text-primary transition-all duration-300">
									<Bell className="h-4 w-4" />
									{notificationCount > 0 && (
										<span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-[10px] font-bold shadow-lg animate-pulse">
											{notificationCount > 9 ? "9+" : notificationCount}
										</span>
									)}
								</Button>
							</Link>
						)}

						{/* User Menu / Login */}
						{mounted && user ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" className="flex items-center gap-2 h-auto p-1.5 hover:bg-primary/10 transition-all duration-300">
										<Avatar className="h-9 w-9 border-2 border-primary/20 transition-all duration-300 hover:border-primary/40 hover:scale-105">
											<AvatarImage src={user.avatar} alt={user.name || "User"} />
											<AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
												{user.name
													?.split(" ")
													.map((n) => n[0])
													.join("")
													.toUpperCase() || user.email[0].toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
											{user.name || user.email}
										</span>
										<ChevronDown className="h-4 w-4 hidden md:block transition-transform duration-300" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-64 p-2">
									<DropdownMenuLabel className="px-3 py-2">
										<div className="flex items-center gap-3">
											<Avatar className="h-10 w-10">
												<AvatarImage src={user.avatar} alt={user.name || "User"} />
												<AvatarFallback className="bg-gradient-to-br from-primary to-primary/80">
													{user.name
														?.split(" ")
														.map((n) => n[0])
														.join("")
														.toUpperCase() || user.email[0].toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col space-y-1">
												<p className="text-sm font-semibold leading-none">
													{user.name || "مستخدم"}
												</p>
												<p className="text-xs leading-none text-muted-foreground truncate">
													{user.email}
												</p>
											</div>
										</div>
									</DropdownMenuLabel>
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
						) : mounted ? (
							<Button variant="default" asChild className="hidden md:flex bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-300">
								<Link href="/login" className="flex items-center gap-2" suppressHydrationWarning>
									<LogIn className="h-4 w-4" />
									تسجيل الدخول
								</Link>
							</Button>
						) : (
							// Placeholder during SSR to prevent hydration mismatch
							<div className="hidden md:flex h-10 w-32" />
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
									{mounted && user ? (
										<div className="space-y-2">
											<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/50">
												<Avatar className="h-12 w-12 border-2 border-primary/20">
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
												className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm hover:bg-accent/80 transition-all duration-300 active:scale-95"
											>
												<User className="h-4 w-4 text-muted-foreground" />
												<span>الملف الشخصي</span>
											</Link>
											<Link
												href="/settings"
												onClick={() => setIsMobileMenuOpen(false)}
												className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm hover:bg-accent/80 transition-all duration-300 active:scale-95"
											>
												<Settings className="h-4 w-4 text-muted-foreground" />
												<span>الإعدادات</span>
											</Link>
											<button
												onClick={() => {
													handleLogout();
													setIsMobileMenuOpen(false);
												}}
												className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm hover:bg-destructive/10 text-destructive transition-all duration-300 active:scale-95"
											>
												<LogOut className="h-4 w-4" />
												<span>تسجيل الخروج</span>
											</button>
										</div>
									) : mounted ? (
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
									) : null}
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</header>
	);
}


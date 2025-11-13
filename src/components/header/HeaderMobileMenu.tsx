"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, LogOut, LogIn, ChevronDown } from "lucide-react";
import { Button } from "@/shared/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { mainNavItemsWithMegaMenu, moreMegaMenu } from "@/components/mega-menu/navData";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/UserProvider";
import { HeaderSearch } from "./HeaderSearch";
import { logger } from '@/lib/logger';

interface HeaderMobileMenuProps {
	isMobileMenuOpen: boolean;
	setIsMobileMenuOpen: (open: boolean) => void;
	isActiveRoute: (href: string) => boolean;
	mounted: boolean;
}

export function HeaderMobileMenu({
	isMobileMenuOpen,
	setIsMobileMenuOpen,
	isActiveRoute,
	mounted,
}: HeaderMobileMenuProps) {
	const mobileMenuRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const { user, logout } = useAuth();
	const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false);
		setExpandedMenus(new Set());
	}, [pathname, setIsMobileMenuOpen]);

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
				setExpandedMenus(new Set());
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMobileMenuOpen, mounted, setIsMobileMenuOpen]);

	const handleLogout = async () => {
		try {
			await logout();
			setIsMobileMenuOpen(false);
			setExpandedMenus(new Set());
		} catch (error) {
			logger.error("Logout error:", error);
		}
	};

	const toggleMegaMenu = (menuKey: string) => {
		setExpandedMenus((prev) => {
			const next = new Set(prev);
			if (next.has(menuKey)) {
				next.delete(menuKey);
			} else {
				next.add(menuKey);
			}
			return next;
		});
	};


	return (
		<AnimatePresence>
			{isMobileMenuOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm"
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
							<HeaderSearch isMobile={true} />

							{/* Mobile Navigation with Mega Menu Support */}
							<div className="space-y-2">
								{mainNavItemsWithMegaMenu.map((item) => {
									const isActive = mounted && isActiveRoute(item.href);
									const menuKey = item.href;
									const isExpanded = expandedMenus.has(menuKey);
									const hasMegaMenu = item.megaMenu && item.megaMenu.length > 0;

									if (hasMegaMenu) {
										return (
											<div key={item.href} className="space-y-1">
												<button
													onClick={() => toggleMegaMenu(menuKey)}
													className={cn(
														"w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group/mobile",
														isActive
															? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm border border-primary/20"
															: "hover:bg-accent/80 active:scale-95"
													)}
												>
													<div className="flex items-center gap-3 flex-1">
														<span className={cn(
															"transition-transform duration-300",
															isActive ? "text-primary scale-110" : "group-hover/mobile:scale-110"
														)}>
															<item.icon className="h-4 w-4" />
														</span>
														<span className="text-right">{item.label}</span>
														{item.badge && (
															<span className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
																{item.badge}
															</span>
														)}
													</div>
													<motion.div
														animate={{ rotate: isExpanded ? 180 : 0 }}
														transition={{ duration: 0.2 }}
													>
														<ChevronDown className="h-4 w-4 text-muted-foreground" />
													</motion.div>
												</button>
												<AnimatePresence>
													{isExpanded && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: "auto", opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.2 }}
															className="overflow-hidden pr-4"
														>
															<div className="space-y-1 py-2">
																{item.megaMenu?.map((category, catIndex) => (
																	<div key={catIndex} className="space-y-1">
																		{catIndex > 0 && (
																			<div className="h-px bg-border/50 my-2" />
																		)}
																		{category.items.map((subItem) => {
																			const subIsActive = mounted && isActiveRoute(subItem.href);
																			return (
																				<Link
																					key={subItem.href}
																					href={subItem.href}
																					prefetch={true}
																					onClick={() => {
																						setIsMobileMenuOpen(false);
																						setExpandedMenus(new Set());
																					}}
																					className={cn(
																						"flex items-center gap-3 px-6 py-2.5 rounded-lg text-sm transition-all duration-300 group/sub-item",
																						subIsActive
																							? "bg-primary/10 text-primary font-medium"
																							: "hover:bg-accent/60 text-muted-foreground"
																					)}
																					suppressHydrationWarning
																				>
																					<span className={cn(
																						"transition-transform duration-300",
																						subIsActive && "text-primary"
																					)}>
																						<subItem.icon className="h-4 w-4" />
																					</span>
																					<span className="flex-1 text-right">{subItem.label}</span>
																					{subItem.badge && (
																						<span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
																							{subItem.badge}
																						</span>
																					)}
																				</Link>
																			);
																		})}
																	</div>
																))}
															</div>
														</motion.div>
													)}
												</AnimatePresence>
											</div>
										);
									}

									return (
									<Link
										key={item.href}
										href={item.href}
										prefetch={true}
										onClick={() => setIsMobileMenuOpen(false)}
										className={cn(
											"flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group/mobile",
											isActive
												? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm border border-primary/20"
												: "hover:bg-accent/80 active:scale-95"
										)}
										suppressHydrationWarning
									>
											<span className={cn(
												"transition-transform duration-300",
												isActive ? "text-primary scale-110" : "group-hover/mobile:scale-110"
											)}>
												<item.icon className="h-4 w-4" />
											</span>
											<span className="flex-1">{item.label}</span>
											{item.badge && (
												<span className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
													{item.badge}
												</span>
											)}
										</Link>
									);
								})}

								{/* قائمة "المزيد" مع Mega Menu */}
								<div className="space-y-1">
									<button
										onClick={() => toggleMegaMenu("more")}
										className={cn(
											"w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group/mobile",
											expandedMenus.has("more")
												? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm border border-primary/20"
												: "hover:bg-accent/80 active:scale-95"
										)}
									>
										<span className="text-right">المزيد</span>
										<motion.div
											animate={{ rotate: expandedMenus.has("more") ? 180 : 0 }}
											transition={{ duration: 0.2 }}
										>
											<ChevronDown className="h-4 w-4 text-muted-foreground" />
										</motion.div>
									</button>
									<AnimatePresence>
										{expandedMenus.has("more") && (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: "auto", opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: 0.2 }}
												className="overflow-hidden pr-4"
											>
												<div className="space-y-1 py-2">
													{moreMegaMenu.map((category, catIndex) => (
														<div key={catIndex} className="space-y-1">
															{catIndex > 0 && (
																<div className="h-px bg-border/50 my-2" />
															)}
															{category.items.map((subItem) => {
																const subIsActive = mounted && isActiveRoute(subItem.href);
																return (
																	<Link
																		key={subItem.href}
																		href={subItem.href}
																		prefetch={true}
																		onClick={() => {
																			setIsMobileMenuOpen(false);
																			setExpandedMenus(new Set());
																		}}
																		className={cn(
																			"flex items-center gap-3 px-6 py-2.5 rounded-lg text-sm transition-all duration-300 group/sub-item",
																			subIsActive
																				? "bg-primary/10 text-primary font-medium"
																				: "hover:bg-accent/60 text-muted-foreground"
																		)}
																		suppressHydrationWarning
																	>
																		<span className={cn(
																			"transition-transform duration-300",
																			subIsActive && "text-primary"
																		)}>
																			<subItem.icon className="h-4 w-4" />
																		</span>
																		<span className="flex-1 text-right">{subItem.label}</span>
																		{subItem.badge && (
																			<span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
																				{subItem.badge}
																			</span>
																		)}
																	</Link>
																);
															})}
														</div>
													))}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>

							{/* Mobile User Section */}
							<div className="pt-4 mt-4 border-t border-border/40">
								{user ? (
									<div className="space-y-2">
										<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-accent/50 to-accent/30 border border-border/50">
											<Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md">
												<AvatarImage src={user.avatar || undefined} alt={user.name || "User"} />
												<AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
													{user.name
														?.split(" ")
														.map((n) => n[0])
														.join("")
														.toUpperCase() || (user.email ? user.email[0].toUpperCase() : 'U')}
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
											onClick={handleLogout}
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
	);
}


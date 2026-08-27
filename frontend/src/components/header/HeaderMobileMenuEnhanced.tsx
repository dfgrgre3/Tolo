"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Search, X, Moon, Sun, Home, LogIn, UserPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { mainNavItemsWithMegaMenu, headerNavItems as fallbackHeaderNavItems, type NavItemWithMegaMenu } from "@/components/mega-menu/navData";
import { buildMobileNavItems, buildMobileSearchResultsWithExtras } from "./headerMenuUtils";
import type { MobileSearchResult } from "./headerMenuUtils";
import { HeaderNavLink } from "@/components/navigation";
import { SITE } from "@thanawy/shared/site-config";
import { cn, toggleThemeWithTransition } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/hooks/use-auth";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildLoginUrl(redirect?: string): string {
	return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HeaderMobileMenuEnhancedProps {
	isMobileMenuOpen: boolean;
	setIsMobileMenuOpen: (open: boolean) => void;
	isActiveRoute: (href: string) => boolean;
	mounted: boolean;
	navItems?: NavItemWithMegaMenu[];
	headerNavItems?: NavItemWithMegaMenu[];
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function HeaderMobileMenuEnhanced({
	isMobileMenuOpen,
	setIsMobileMenuOpen,
	isActiveRoute,
	mounted,
	navItems = mainNavItemsWithMegaMenu,
	headerNavItems = fallbackHeaderNavItems,
}: HeaderMobileMenuEnhancedProps) {
	const mobileMenuRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const { user, logout, isLoading } = useAuth();

	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchFocused, setIsSearchFocused] = useState(false);

	// â”€â”€ Close menu helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const closeMobileMenu = useCallback(() => {
		setIsMobileMenuOpen(false);
		setExpandedMenus(new Set());
		setSearchQuery("");
	}, [setIsMobileMenuOpen]);

	// â”€â”€ Lock body scroll when open (without layout shift) â”€â”€â”€â”€â”€â”€â”€â”€
	// Mobile menu is a fullscreen drawer, so scroll lock is justified.
	// We use scrollbar-gutter: stable on <html> (set in globals.css)
	// so the scrollbar placeholder remains visible and no layout shift occurs.
	useEffect(() => {
		if (isMobileMenuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isMobileMenuOpen]);

	// â”€â”€ Click outside to close â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	useEffect(() => {
		if (!mounted || !isMobileMenuOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				mobileMenuRef.current &&
				!mobileMenuRef.current.contains(target) &&
				!target?.closest?.("[data-mobile-menu-trigger]")
			) {
				closeMobileMenu();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [closeMobileMenu, isMobileMenuOpen, mounted]);

	// â”€â”€ Focus trap & initial focus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	useEffect(() => {
		if (!isMobileMenuOpen || !mobileMenuRef.current) return;

		// Move focus to close button when menu opens
		setTimeout(() => closeButtonRef.current?.focus(), 50);

		const panel = mobileMenuRef.current;
		const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeMobileMenu();
				return;
			}
			if (e.key !== "Tab") return;

			const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
				(el) => el.offsetParent !== null
			);
			if (focusable.length === 0) return;

			const first = focusable[0]!;
			const last = focusable[focusable.length - 1]!;

			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		panel.addEventListener("keydown", handleKeyDown);
		return () => panel.removeEventListener("keydown", handleKeyDown);
	}, [isMobileMenuOpen, closeMobileMenu]);

	// â”€â”€ Toggle mega menu section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const toggleMegaMenu = useCallback((menuKey: string) => {
		setExpandedMenus((prev) => {
			const next = new Set(prev);
			if (next.has(menuKey)) next.delete(menuKey);
			else next.add(menuKey);
			return next;
		});
	}, []);

	// â”€â”€ Theme toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const toggleTheme = useCallback(
		(e?: React.MouseEvent) => {
			const nextTheme = theme === "dark" ? "light" : "dark";
			toggleThemeWithTransition(nextTheme, setTheme, e);
		},
		[theme, setTheme]
	);

	// â”€â”€ Nav items & search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const allNavItems = useMemo(() => buildMobileNavItems(navItems), [navItems]);

	const searchResults = useMemo<MobileSearchResult[]>(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return [];

		return buildMobileSearchResultsWithExtras(allNavItems, [
			{ label: "Ù…Ø¯Ø§Ø±Ø³", categories: headerNavItems?.[0]?.megaMenu }
		])
			.filter(
				(entry) =>
					entry.label.toLowerCase().includes(query) ||
					entry.href.toLowerCase().includes(query) ||
					entry.section?.toLowerCase().includes(query)
			)
			.slice(0, 12);
	}, [allNavItems, searchQuery, headerNavItems]);

	const handleSearch = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (searchResults.length === 0) return;
			router.push(searchResults[0]!.href);
			closeMobileMenu();
		},
		[closeMobileMenu, router, searchResults]
	);

	const [loginUrl, setLoginUrl] = useState<string>("/login");

	useEffect(() => {
		const query =
			typeof window !== "undefined"
				? window.location.search.replace(/^\?/, "")
				: "";
		queueMicrotask(() => setLoginUrl(buildLoginUrl(`${pathname || "/"}${query ? `?${query}` : ""}`)));
	}, [pathname]);

	// â”€â”€ Render helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const renderSearchResult = useCallback(
		(result: MobileSearchResult) => (
			<HeaderNavLink
				key={`${result.href}::${result.label}`}
				href={result.href}
				label={result.label}
				icon={result.icon}
				badge={result.badge}
				active={mounted && isActiveRoute(result.href)}
				variant="search"
				onClick={closeMobileMenu}
			/>
		),
		[isActiveRoute, mounted, closeMobileMenu]
	);

	// â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	return (
		<>
			{isMobileMenuOpen && (
			<>
			{/* Backdrop */}
			<div
				className={cn(
					"fixed inset-0 bg-black/65 dark:bg-black/80 z-[60] lg:hidden backdrop-blur-sm",
					isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
				)}
				onClick={closeMobileMenu}
				aria-hidden="true"
			/>

			{/* Menu Panel */}
			<div
				ref={mobileMenuRef}
				id="mobile-menu"
				data-header-root
				role="dialog"
				aria-modal="true"
				aria-label="Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªÙ†Ù‚Ù„"
				className={cn(
					"fixed top-0 bottom-0 ltr:right-0 ltr:left-auto rtl:left-0 rtl:right-auto w-[85%] max-w-sm bg-background/90 dark:bg-background/80 backdrop-blur-2xl z-[70] overflow-hidden lg:hidden flex flex-col shadow-2xl ltr:border-l rtl:border-r border-primary/10 shadow-primary/5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] ltr:pr-[env(safe-area-inset-right)] rtl:pl-[env(safe-area-inset-left)]",
					isMobileMenuOpen ? "translate-x-0" : "ltr:translate-x-full rtl:-translate-x-full"
				)}
			>
				{/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
				<div className="flex items-center justify-between p-4 pb-2 border-b border-border/20">
					<div className="flex items-center gap-2.5">
						<div className="relative shrink-0">
							<Image
								src={SITE.logo}
								alt=""
								width={36}
								height={36}
								sizes="36px"
								className="h-9 w-9 object-contain"
							/>
						</div>
						<div className="flex flex-col min-w-0">
							<span className="font-bold text-base text-foreground truncate">
								{SITE.name}
							</span>
							{SITE.tagline && (
								<span className="text-[10px] text-muted-foreground font-medium truncate">
									{SITE.tagline}
								</span>
							)}
						</div>
					</div>
					<Button
						ref={closeButtonRef}
						variant="ghost"
						size="icon"
						onClick={closeMobileMenu}
						className="rounded-full hover:bg-destructive/10 hover:text-destructive h-9 w-9 shrink-0"
						aria-label="Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©"
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</Button>
				</div>

				{/* â”€â”€ Scrollable Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
				<div className="flex-1 overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling: touch">
					{/* Search */}
					<div className="px-4 py-3">
						<form onSubmit={handleSearch} className="relative">
							<Input
								type="search"
								placeholder="Ø§Ø¨Ø­Ø« Ø¯Ø§Ø®Ù„ Ø§Ù„ØªÙ†Ù‚Ù„..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onFocus={() => setIsSearchFocused(true)}
								onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
								className={cn(
									"w-full ps-10 pe-3 h-11 rounded-2xl bg-muted/50 border-transparent focus:bg-background text-start text-base outline-none",
									isSearchFocused && "ring-2 ring-primary/20 border-primary/20"
								)}
								aria-label="Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©"
							/>
							<Search
								className={cn(
									"absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none",
									isSearchFocused && "text-primary"
								)}
								aria-hidden="true"
							/>
						</form>
					</div>

					{/* User Section */}
					<div className="px-4 py-2">
						{isLoading ? (
							<div className="h-16 w-full rounded-2xl bg-muted" role="status" aria-label="Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„" />
						) : user ? (
							<div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 shadow-sm">
								<div className="flex items-center gap-2.5">
									<Avatar className="h-10 w-10 border-2 border-background shadow-md shrink-0">
										<AvatarImage src={user.avatar || undefined} alt="" />
										<AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
											{user.name?.[0] || user.email?.[0]?.toUpperCase() || "?"}
										</AvatarFallback>
									</Avatar>
									<div className="flex flex-col min-w-0 flex-1">
										<span className="font-bold text-sm truncate text-foreground">
											{user.name || user.username}
										</span>
										<span className="text-xs text-muted-foreground truncate">{user.email}</span>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive shrink-0"
										onClick={() => {
											logout();
											closeMobileMenu();
										}}
										aria-label="ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬"
									>
										<LogOut className="h-3.5 w-3.5" aria-hidden="true" />
									</Button>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-2.5">
								<Button
									variant="outline"
									className="rounded-2xl h-10 border-primary/20 hover:bg-primary/5 text-primary gap-1.5 font-bold text-sm"
									asChild
								>
									<Link href={loginUrl} onClick={closeMobileMenu}>
										<LogIn className="h-3.5 w-3.5" aria-hidden="true" />
										Ø¯Ø®ÙˆÙ„
									</Link>
								</Button>
								<Button
									className="rounded-2xl h-10 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-lg shadow-primary/20 font-bold text-sm"
									asChild
								>
									<Link href="/register" onClick={closeMobileMenu}>
										<UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
										Ø§Ø´ØªØ±Ø§Ùƒ
									</Link>
								</Button>
							</div>
						)}
					</div>

					{/* Navigation */}
					<nav className="px-3 pb-6 space-y-2" aria-label="Ø§Ù„ØªÙ†Ù‚Ù„ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ">
						{searchQuery.trim() ? (
							<div className="space-y-1.5">
								{searchResults.length > 0 ? (
									searchResults.map(renderSearchResult)
								) : (
									<div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
										Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù…Ø·Ø§Ø¨Ù‚Ø©
									</div>
								)}
							</div>
						) : (
							<>
								<HeaderNavLink
									href="/"
									label="Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©"
									icon={Home}
									active={mounted && isActiveRoute("/")}
									variant="mobile"
									onClick={closeMobileMenu}
								/>

								{allNavItems.map((item) => {
									const active = mounted && isActiveRoute(item.href);
									const hasMegaMenu = !!item.megaMenu?.length;
									const isExpanded = expandedMenus.has(item.href);
									const Icon = item.icon;

									return (
										<div key={item.href}>
											{hasMegaMenu ? (
												<div className="space-y-1">
													<button
														type="button"
														onClick={() => toggleMegaMenu(item.href)}
														aria-expanded={isExpanded}
														className={cn(
															"w-full flex items-center justify-between gap-2.5 p-3 rounded-xl border border-transparent touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
															active
																? "bg-primary/10 text-primary font-bold border-primary/10"
																: "hover:bg-muted font-medium text-foreground/80 hover:text-foreground"
														)}
													>
														<div className="flex items-center gap-2.5">
															<div
																className={cn(
																	"flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
																	active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
																)}
															>
																<Icon className="h-3.5 w-3.5" aria-hidden="true" />
															</div>
															<span className="text-sm">{item.label}</span>
															{item.badge && (
																<span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary text-white rounded-full">
																	{item.badge}
																</span>
															)}
														</div>
														<ChevronDown
															className={cn(
																"h-3.5 w-3.5 shrink-0",
																isExpanded ? "rotate-180 text-primary" : "text-muted-foreground"
															)}
															aria-hidden="true"
														/>
													</button>

													{isExpanded && (
														<div className="ms-3 ps-3 border-s-2 border-primary/10 space-y-1 py-1 my-1">
															{item.megaMenu!.map((category, catIndex) => (
																<div key={`${item.href}-cat-${catIndex}`} className="space-y-1">
																	{catIndex > 0 && <div className="h-px bg-border/40 my-2 w-3/4 mx-auto" />}
																	{category.items.map((subItem) => {
																		const subActive = mounted && isActiveRoute(subItem.href);
																		const SubIcon = subItem.icon;
																		return (
																			<Link
																				key={`${subItem.href}::${subItem.label}`}
																				href={subItem.href}
																				onClick={closeMobileMenu}
																				className={cn(
																					"flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
																					subActive
																						? "bg-primary/10 text-primary font-bold"
																						: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
																				)}
																			>
																				<SubIcon className="h-3.5 w-3.5 opacity-70 shrink-0" aria-hidden="true" />
																				<span className="flex-1 text-sm">{subItem.label}</span>
																				{subItem.badge && (
																					<span className="px-1 py-0.5 text-[9px] bg-primary/10 text-primary rounded-full font-bold shrink-0">
																						{subItem.badge}
																					</span>
																				)}
																			</Link>
																		);
																	})}
																</div>
															))}
														</div>
													)}
												</div>
											) : (
												<HeaderNavLink
													href={item.href}
													label={item.label}
													icon={Icon}
													badge={item.badge}
													active={active}
													variant="mobile"
													onClick={closeMobileMenu}
												/>
											)}
										</div>
									);
								})}
							</>
						)}
					</nav>
				</div>

				{/* â”€â”€ Footer: Theme Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
				<div className="p-4 border-t border-border/40 bg-muted/20 mt-auto shrink-0">
					<Button
						variant="outline"
						onClick={(e) => toggleTheme(e)}
						className="w-full justify-between bg-background/50 border-border/50 h-9 rounded-xl text-sm"
						aria-label={`ØªØ¨Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø¸Ù‡Ø±ØŒ Ø§Ù„Ø­Ø§Ù„ÙŠ: ${theme === "dark" ? "Ø¯Ø§ÙƒÙ†" : "ÙØ§ØªØ­"}`}
					>
						<span className="text-sm font-medium">Ø§Ù„Ù…Ø¸Ù‡Ø±</span>
						{theme === "dark" ? (
							<div className="flex items-center gap-1.5 text-primary">
								<Moon className="h-3.5 w-3.5" aria-hidden="true" />
								<span className="text-xs">Ø¯Ø§ÙƒÙ†</span>
							</div>
						) : (
							<div className="flex items-center gap-1.5 text-orange-500">
								<Sun className="h-3.5 w-3.5" aria-hidden="true" />
								<span className="text-xs">ÙØ§ØªØ­</span>
							</div>
						)}
					</Button>
				</div>
			</div>
			</>
			)}
		</>
	);
}

export default HeaderMobileMenuEnhanced;
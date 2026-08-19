"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { TimeTrackerHeaderWidget } from "./TimeTrackerHeaderWidget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderNavigation } from "./HeaderNavigation";
import { HeaderNotifications } from "./HeaderNotifications";
import { useMegaMenuState } from "./useMegaMenuState";
import { MegaMenu } from "@/components/mega-menu";
import { headerNavItems as fallbackHeaderNavItems, mainNavItemsWithMegaMenu } from "@/components/mega-menu/navData";
import { apiClient } from "@/lib/api/api-client";
import { getLucideIcon } from "./headerIconMapper";
import { useTimeTrackerStore } from "@/hooks/use-time-tracker-store";
import ProgressIndicator from "./ProgressIndicator";
import { useHeaderKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useStickyHeader } from "@/hooks/use-sticky-header";
import { useAuth } from "@/hooks/use-auth";
import { UserMenu } from "./UserMenu";
import { useEfficiencyMode } from "@/hooks/use-efficiency-mode";
import { ImpersonationBanner } from "./ImpersonationBanner";
import {
	useLoginUrl,
	useHeaderClasses,
	useContainerHeight,
	useHeaderWidgets
} from "./useHeaderOptimizations";
import type { User } from "@/types/user";

// ─── Dynamic Imports ─────────────────────────────────────────────

const CommandPalette = dynamic(
	() =>
		import("./CommandPalette")
			.then((mod) => ({ default: mod.CommandPalette }))
			.catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const SmartNavigationSuggestions = dynamic(
	() =>
		import("./SmartNavigationSuggestions")
			.then((mod) => ({ default: mod.SmartNavigationSuggestions }))
			.catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const HeaderMobileMenuEnhanced = dynamic(
	() =>
		import("./HeaderMobileMenuEnhanced")
			.then((mod) => ({ default: mod.HeaderMobileMenuEnhanced }))
			.catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const ReadingProgressBar = dynamic(
	() =>
		import("./ReadingProgressBar")
			.then((mod) => ({ default: mod.ReadingProgressBar }))
			.catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

// ─── Memoized Sub-components ─────────────────────────────────────

const MemoizedHeaderLogo = memo(HeaderLogo);
const MemoizedHeaderSearch = memo(HeaderSearch);
const MemoizedHeaderNavigation = memo(HeaderNavigation);

// ─── Component ───────────────────────────────────────────────────

export default function Header() {
	const pathname = usePathname();
	const isEfficiencyMode = useEfficiencyMode();
	const loginUrl = useLoginUrl();

	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

	useEffect(() => {
		const handleOpenCommandPalette = () => {
			setIsCommandPaletteOpen((prev) => !prev);
		};
		window.addEventListener("open-command-palette", handleOpenCommandPalette);
		return () => {
			window.removeEventListener("open-command-palette", handleOpenCommandPalette);
		};
	}, []);

	const headerRef = useRef<HTMLElement>(null);

	const { isScrolled, isShrunk } = useStickyHeader({
		shrinkThreshold: 80,
		hideThreshold: 300,
		showOnScrollUp: true,
		enableProgress: true
	});

	const { user, isLoading } = useAuth();
	const { openMegaMenu, setOpenMegaMenu, mounted } = useMegaMenuState();

	const [dynamicMainNav, setDynamicMainNav] = useState(mainNavItemsWithMegaMenu);
	const [dynamicHeaderNav, setDynamicHeaderNav] = useState(fallbackHeaderNavItems);

	const setUserId = useTimeTrackerStore((state) => state.setUserId);
	useEffect(() => {
		if (mounted) {
			setUserId(user?.id || null);
		}
	}, [user?.id, mounted, setUserId]);

	useEffect(() => {
		if (!mounted) return;

		const fetchNavData = async () => {
			try {
				const response = await apiClient.get<{ categories: any[] }>("/navigation/menu");
				if (response && response.categories) {
					const categoriesBySlug = response.categories.reduce((acc, cat) => {
						acc[cat.slug] = {
							title: cat.title,
							slug: cat.slug,
							isPriority: cat.isPriority,
							priorityLabel: cat.priorityLabel,
							items: (cat.items || []).map((item: any) => ({
								href: item.href,
								label: item.label,
								description: item.description,
								icon: getLucideIcon(item.icon),
								badge: item.badge
							}))
						};
						return acc;
					}, {} as Record<string, any>);

					const updatedMainNav = mainNavItemsWithMegaMenu.map((item) => {
						if (!item.megaMenu) return item;
						let targetSlugs: string[] = [];
						if (item.href === "/courses") {
							targetSlugs = ["study", "exams", "time_management", "goals"];
						} else if (item.href === "/library") {
							targetSlugs = ["digital_library", "awareness", "dashboard"];
						} else if (item.href === "/leaderboard") {
							targetSlugs = ["leaderboard", "community"];
						} else if (item.href === "/settings") {
							targetSlugs = ["subscription", "settings"];
						}

						const newMegaMenu = targetSlugs
							.map((slug) => categoriesBySlug[slug])
							.filter(Boolean);

						return {
							...item,
							megaMenu: newMegaMenu.length > 0 ? newMegaMenu : item.megaMenu
						};
					});

					const updatedHeaderNav = fallbackHeaderNavItems.map((item) => {
						if (!item.megaMenu) return item;
						let targetSlugs: string[] = [];
						if (item.href === "/schools") {
							targetSlugs = ["primary", "middle", "high_school"];
						}
						const newMegaMenu = targetSlugs
							.map((slug) => categoriesBySlug[slug])
							.filter(Boolean);

						return {
							...item,
							megaMenu: newMegaMenu.length > 0 ? newMegaMenu : item.megaMenu
						};
					});

					setDynamicMainNav(updatedMainNav);
					setDynamicHeaderNav(updatedHeaderNav);
				}
			} catch (err) {
				console.warn("Failed to fetch dynamic navigation menu from backend:", err);
			}
		};

		fetchNavData();
	}, [mounted]);

	const headerClasses = useHeaderClasses(isScrolled, mounted, user);
	const containerHeight = useContainerHeight(isShrunk);
	const widgets = useHeaderWidgets(isEfficiencyMode);

	// ── Header height / bottom edge CSS variables ─────────────────
	// --header-height: ارتفاع الـ Header الفعلي
	// --header-bottom: موضع الحافة السفلية للـ Header بالنسبة للـ viewport
	//   يستخدمه الـ Mega Menu ليبقى ملاصقاً تماماً أسفل الـ Header بدون أي فراغ

	useEffect(() => {
		if (!mounted || !headerRef.current) return;

		let lastHeight = -1;
		let lastBottom = -1;

		const updateMetrics = () => {
			const element = headerRef.current;
			if (!element) return;

			const rect = element.getBoundingClientRect();
			const height = Math.round(rect.height);
			const bottom = Math.max(0, Math.round(rect.bottom));

			if (height !== lastHeight) {
				lastHeight = height;
				document.documentElement.style.setProperty("--header-height", `${height}px`);
			}
			if (bottom !== lastBottom) {
				lastBottom = bottom;
				document.documentElement.style.setProperty("--header-bottom", `${bottom}px`);
			}
		};

		updateMetrics();

		const observer = new ResizeObserver(updateMetrics);
		observer.observe(headerRef.current);
		window.addEventListener("scroll", updateMetrics, { passive: true });
		window.addEventListener("resize", updateMetrics);

		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", updateMetrics);
			window.removeEventListener("resize", updateMetrics);
		};
	}, [mounted]);

	// ── Keyboard shortcuts ────────────────────────────────────────

	useHeaderKeyboardShortcuts({
		mounted,
		isMobileMenuOpen,
		setIsMobileMenuOpen
	});

	// ── Close mobile menu on route change ─────────────────────────

	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [pathname]);

	// ── Helpers ───────────────────────────────────────────────────

	const toggleMobileMenu = useCallback(() => {
		setIsMobileMenuOpen((prev) => !prev);
	}, []);

	const isActiveRoute = useCallback(
		(href: string) => {
			if (!pathname) return false;
			if (href === "/") return pathname === "/";
			return pathname.startsWith(href);
		},
		[pathname]
	);

	const schoolsNavItem = dynamicHeaderNav[0];

	// ── Render ────────────────────────────────────────────────────

	return (
		<>
			<ImpersonationBanner />

			{widgets.progress && <ReadingProgressBar position="top" height={1} />}

			<header
				ref={headerRef}
				data-header-root
				className={headerClasses}
				role="banner"
				aria-label="رأس الصفحة الرئيسي"
			>
				<div className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 max-w-full">
					<div
						className={cn(
							"flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-6",
							containerHeight
						)}
					>
						{/* ── Left: Logo & Teaching Links ────────────────── */}
						<div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
							<MemoizedHeaderLogo />
							<div className="hidden lg:flex items-center gap-2">
								<Link
									href="/teach"
									className="text-sm font-semibold text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-primary/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
								>
									التدريس على Tolo
								</Link>
								<Link
									href="/careers"
									className="text-sm font-semibold text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-primary/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
								>
									وظائف Tolo
								</Link>
							</div>
						</div>

						{/* ── Center: Search ─────────────────────────────── */}
						<div className="flex-1 max-w-2xl mx-4">
							<MemoizedHeaderSearch />
						</div>

						{/* ── Right: Widgets & Actions ───────────────────── */}
						<div
							className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0"
							role="toolbar"
							aria-label="أدوات الرأس"
						>
							{isShrunk && widgets.progress && (
								<div className="hidden xl:flex">
									<ProgressIndicator />
								</div>
							)}

							{/* Schools MegaMenu */}
							{schoolsNavItem && (
								<div className="hidden lg:block">
									<MegaMenu
										categories={schoolsNavItem.megaMenu || []}
										isOpen={openMegaMenu === schoolsNavItem.href}
										onClose={() => setOpenMegaMenu(null)}
										onOpen={() => setOpenMegaMenu(schoolsNavItem.href)}
										activeRoute={isActiveRoute}
										label={schoolsNavItem.label}
										user={user as User | null}
										zIndex={50}
										className="relative h-11 px-4 flex items-center gap-2 rounded-xl font-semibold text-sm text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:bg-primary/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
									/>
								</div>
							)}

							{/* Plans Link */}
							<Link
								href="/plans"
								className="hidden lg:flex items-center h-11 px-4 text-sm font-semibold text-muted-foreground hover:text-primary rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
							>
								الخطط
							</Link>

							{widgets.suggestions && (
								<div className="hidden xl:block">
									<SmartNavigationSuggestions />
								</div>
							)}

							<TimeTrackerHeaderWidget />

							{mounted && (
								<div className="hidden sm:flex items-center gap-1.5">
									<ThemeToggle />
								</div>
							)}

							{mounted && <HeaderNotifications user={user as User | null} mounted={mounted} />}

							{/* Auth Section */}
							<div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
								{(!mounted || isLoading) ? (
									<div
										className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 animate-pulse"
										role="status"
										aria-label="جاري التحميل"
									/>
								) : user ? (
									<UserMenu />
								) : (
									<div className="flex items-center gap-1 sm:gap-1.5">
										<Link href={loginUrl}>
											<Button
												variant="ghost"
												size="sm"
												className="gap-1.5 hover:bg-primary/10 text-sm font-semibold px-2 sm:px-3 lg:px-4"
											>
												<LogIn className="h-4 w-4" aria-hidden="true" />
												<span className="hidden sm:inline">تسجيل الدخول</span>
											</Button>
										</Link>
										<Link href="/register" className="hidden sm:block">
											<Button
												size="sm"
												className="gap-2 bg-gradient-to-r from-primary via-primary/95 to-primary/80 hover:from-primary hover:to-primary/90 text-primary-foreground shadow-[0_4px_15px_rgba(var(--primary),0.25)] hover:shadow-primary/40 font-bold px-3 sm:px-4 lg:px-6 relative overflow-hidden"
											>
												<UserPlus className="h-4 w-4 relative z-10" aria-hidden="true" />
												<span className="relative z-10 font-bold hidden md:inline">إنشاء حساب</span>
											</Button>
										</Link>
									</div>
								)}
							</div>

							{/* Mobile Menu Toggle */}
							<Button
								variant="ghost"
								size="icon"
								className="lg:hidden hover:bg-primary/10 dark:hover:bg-primary/15 h-9 w-9 sm:h-10 sm:w-10 shrink-0"
								onClick={toggleMobileMenu}
								aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
								aria-expanded={isMobileMenuOpen}
								aria-controls="mobile-menu"
								data-mobile-menu-trigger
							>
								{isMobileMenuOpen ? (
									<X className="h-5 w-5" aria-hidden="true" />
								) : (
									<Menu className="h-5 w-5" aria-hidden="true" />
								)}
							</Button>
						</div>
					</div>

					{/* ── Second Row: Navigation ─────────────────────────── */}
					<div className="hidden lg:flex items-center justify-center border-t border-border/40 py-1.5">
						<MemoizedHeaderNavigation
							openMegaMenu={openMegaMenu}
							setOpenMegaMenu={setOpenMegaMenu}
							isActiveRoute={isActiveRoute}
							mounted={mounted}
							user={user as User | null}
							navItems={dynamicMainNav}
						/>
					</div>
				</div>

				{/* Bottom glow border */}
				<div
					className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none"
					aria-hidden="true"
				/>
			</header>

			<HeaderMobileMenuEnhanced
				key={pathname || "root"}
				isMobileMenuOpen={isMobileMenuOpen}
				setIsMobileMenuOpen={setIsMobileMenuOpen}
				isActiveRoute={isActiveRoute}
				mounted={mounted}
				navItems={dynamicMainNav}
				headerNavItems={dynamicHeaderNav}
			/>

			<CommandPalette
				open={isCommandPaletteOpen}
				onOpenChange={setIsCommandPaletteOpen}
			/>
		</>
	);
}
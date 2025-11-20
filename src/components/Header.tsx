"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HeaderLogo } from "./header/HeaderLogo";
import { HeaderSearch } from "./header/HeaderSearch";
import { HeaderNavigation } from "./header/HeaderNavigation";
import { HeaderNotifications } from "./header/HeaderNotifications";
import { EnhancedNotifications } from "./header/EnhancedNotifications";
import { HeaderUserMenu } from "./header/HeaderUserMenu";
import { HeaderMobileMenu } from "./header/HeaderMobileMenu";
import { HeaderBreadcrumbs } from "./header/HeaderBreadcrumbs";
import { useUnifiedAuth } from "@/contexts/auth-context";
import { useMegaMenuState } from "./header/useMegaMenuState";
import { useKeyboardShortcuts } from "@/app/time/hooks/useKeyboardShortcuts";
import { HeaderCustomization, useHeaderPreferences } from "./header/HeaderCustomization";
import ProgressIndicator from "./header/ProgressIndicator";

// Dynamic imports for better performance (Next.js code splitting)
// Using robust error handling to prevent HMR issues
const CommandPalette = dynamic(
	() => import("./header/CommandPalette").then((mod) => ({ default: mod.CommandPalette })).catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const QuickActions = dynamic(
	() => import("./header/QuickActions").then((mod) => ({ default: mod.QuickActions })).catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const ActivityWidget = dynamic(
	() => import("./header/ActivityWidget").then((mod) => ({ default: mod.ActivityWidget })).catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const ContextualHelp = dynamic(
	() => import("./header/ContextualHelp").then((mod) => ({ default: mod.ContextualHelp })).catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const KeyboardShortcutsDisplay = dynamic(
	() => import("./header/KeyboardShortcutsDisplay").then((mod) => ({ default: mod.KeyboardShortcutsDisplay })).catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const SmartNavigationSuggestions = dynamic(
	() => import("./header/SmartNavigationSuggestions").then((mod) => ({ default: mod.SmartNavigationSuggestions })).catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

const LanguageSwitch = dynamic(
	() => import("./header/LanguageSwitch").then((mod) => ({ default: mod.LanguageSwitch })).catch(() => ({ default: () => null })),
	{ ssr: false, loading: () => null }
);

// Throttle function for scroll optimization
function throttle<T extends (...args: unknown[]) => unknown>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	return function (this: unknown, ...args: Parameters<T>) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

export default function Header() {
	const pathname = usePathname();
	const [isMounted, setIsMounted] = useState(false);
	
	// Ensure component is mounted before using hooks
	useEffect(() => {
		setIsMounted(true);
	}, []);
	
	// Safely get user - useUnifiedAuth is the unified authentication hook
	const authContext = useUnifiedAuth();
	const user = authContext?.user ?? null;
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	
	// استخدام hook مشترك لإدارة حالة Mega Menu
	const { openMegaMenu, setOpenMegaMenu, mounted } = useMegaMenuState();
	
	// Header preferences
	const { preferences: headerPreferences } = useHeaderPreferences();

	// Handle scroll effect with throttling for better performance
	useEffect(() => {
		if (!mounted || typeof window === "undefined") return;
		
		const handleScroll = throttle(() => {
			const scrolled = window.scrollY > 10;
			setIsScrolled(scrolled);
		}, 16); // ~60fps
		
		// Initial check
		handleScroll();
		
		// Add scroll listener with passive option for better performance
		window.addEventListener("scroll", handleScroll, { passive: true });
		
		// Cleanup
		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, [mounted]);

	// إغلاق القائمة المحمولة عند تغيير المسار
	useEffect(() => {
		setIsMobileMenuOpen(false);
		setOpenMegaMenu(null);
	}, [pathname, setOpenMegaMenu]);

	// Memoized active route checker
	const isActiveRoute = useCallback((href: string) => {
		if (!pathname) {
			return false;
		}
		if (href === "/") {
			return pathname === "/";
		}
		return pathname.startsWith(href);
	}, [pathname]);

	// Keyboard shortcuts handler
	useKeyboardShortcuts({
		mounted,
		isMobileMenuOpen,
		setIsMobileMenuOpen,
	});

	// Command Palette keyboard shortcut
	useEffect(() => {
		if (!mounted) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if typing in input/textarea
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}

			// Ctrl/Cmd + K for command palette
			if ((e.ctrlKey || e.metaKey) && e.key === "k" && !e.shiftKey && !e.altKey) {
				e.preventDefault();
				setIsCommandPaletteOpen((prev) => !prev);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [mounted]);

	// Toggle mobile menu with better state management
	const toggleMobileMenu = useCallback(() => {
		setIsMobileMenuOpen((prev) => {
			const newState = !prev;
			// Prevent body scroll when menu is open
			if (typeof document !== "undefined") {
				if (newState) {
					document.body.style.overflow = "hidden";
				} else {
					document.body.style.overflow = "";
				}
			}
			return newState;
		});
	}, []);

	// Cleanup body overflow on unmount
	useEffect(() => {
		return () => {
			if (typeof document !== "undefined") {
				document.body.style.overflow = "";
			}
		};
	}, []);

	// Memoized header classes for better performance
	const headerClasses = useMemo(
		() =>
			cn(
				"sticky top-0 z-50 w-full border-b transition-all duration-500 ease-in-out",
				"bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70",
				mounted &&
					isScrolled &&
					"shadow-xl shadow-black/10 dark:shadow-black/30 border-b-border/50",
				isMounted && user &&
					"border-primary/20 dark:border-primary/30 bg-gradient-to-r from-primary/5 via-background/80 to-primary/5 dark:from-primary/10 dark:via-background/70 dark:to-primary/10 shadow-primary/10",
				headerPreferences.compactMode && "h-12"
			),
		[mounted, isScrolled, isMounted, user, headerPreferences.compactMode]
	);

	return (
		<header
			className={headerClasses}
			suppressHydrationWarning
			role="banner"
			aria-label="رأس الصفحة الرئيسي"
		>
			<div className="container mx-auto px-4">
				<div className={cn("flex items-center justify-between gap-4", headerPreferences.compactMode ? "h-12" : "h-16")}>
					{/* Logo */}
					<HeaderLogo />

					{/* Desktop Navigation */}
					<HeaderNavigation
						openMegaMenu={openMegaMenu}
						setOpenMegaMenu={setOpenMegaMenu}
						isActiveRoute={isActiveRoute}
						mounted={mounted}
						user={user}
					/>

					{/* Right Side Actions */}
					<div className="flex items-center gap-2" role="toolbar" aria-label="أدوات الرأس">
						{/* Progress Indicator */}
						{headerPreferences.showProgress && <ProgressIndicator />}

						{/* Smart Navigation Suggestions */}
						{headerPreferences.showSuggestions && <SmartNavigationSuggestions />}

						{/* Search */}
						<HeaderSearch />

						{/* Quick Actions */}
						<QuickActions />

						{/* Activity Widget */}
						{headerPreferences.showActivity && <ActivityWidget />}

						{/* Contextual Help */}
						<ContextualHelp />

						{/* Keyboard Shortcuts Display */}
						<KeyboardShortcutsDisplay />

						{/* Header Customization */}
						<HeaderCustomization />

						{/* Theme Toggle */}
						{mounted && (
							<div className="hidden md:flex" suppressHydrationWarning>
								<ThemeToggle />
							</div>
						)}

						{/* Notifications Dropdown */}
						{isMounted && <EnhancedNotifications user={user} mounted={mounted} />}

						{/* User Menu / Login */}
						<HeaderUserMenu />

						{/* Mobile Menu Button */}
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden"
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
			</div>

			{/* Breadcrumbs */}
			<HeaderBreadcrumbs />

			{/* Mobile Menu */}
			<HeaderMobileMenu
				isMobileMenuOpen={isMobileMenuOpen}
				setIsMobileMenuOpen={setIsMobileMenuOpen}
				isActiveRoute={isActiveRoute}
				mounted={mounted}
			/>

			{/* Command Palette */}
			<CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />
		</header>
	);
}

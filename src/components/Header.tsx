"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/shared/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HeaderLogo } from "./header/HeaderLogo";
import { HeaderSearch } from "./header/HeaderSearch";
import { HeaderNavigation } from "./header/HeaderNavigation";
import { HeaderNotifications } from "./header/HeaderNotifications";
import { HeaderUserMenu } from "./header/HeaderUserMenu";
import { HeaderMobileMenu } from "./header/HeaderMobileMenu";
import { useAuth } from "@/components/auth/UserProvider";
import { useMegaMenuState } from "./header/useMegaMenuState";

export default function Header() {
	const pathname = usePathname();
	const { user } = useAuth();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	
	// استخدام hook مشترك لإدارة حالة Mega Menu
	const { openMegaMenu, setOpenMegaMenu, mounted } = useMegaMenuState();

	// Handle scroll effect
	useEffect(() => {
		if (!mounted) return;
		
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		
		handleScroll();
		
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [mounted]);

	// إغلاق القائمة المحمولة عند تغيير المسار
	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [pathname]);

	const isActiveRoute = useCallback((href: string) => {
		if (!pathname) {
			return false;
		}
		if (href === "/") {
			return pathname === "/";
		}
		return pathname.startsWith(href);
	}, [pathname]);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 w-full border-b transition-all duration-500",
				"bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70",
				mounted && isScrolled && "shadow-xl shadow-black/10 dark:shadow-black/30 border-b-border/50",
				user && "border-primary/20 dark:border-primary/30 bg-gradient-to-r from-primary/5 via-background/80 to-primary/5 dark:from-primary/10 dark:via-background/70 dark:to-primary/10 shadow-primary/10"
			)}
			suppressHydrationWarning
		>
			<div className="container mx-auto px-4">
				<div className="flex h-16 items-center justify-between gap-4">
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
					<div className="flex items-center gap-2">
						{/* Search */}
						<HeaderSearch />

						{/* Theme Toggle */}
						{mounted && (
							<div className="hidden md:flex" suppressHydrationWarning>
								<ThemeToggle />
							</div>
						)}

						{/* Notifications Dropdown */}
						<HeaderNotifications user={user} mounted={mounted} />

						{/* User Menu / Login */}
						<HeaderUserMenu />

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
			<HeaderMobileMenu
				isMobileMenuOpen={isMobileMenuOpen}
				setIsMobileMenuOpen={setIsMobileMenuOpen}
				isActiveRoute={isActiveRoute}
				mounted={mounted}
			/>
		</header>
	);
}

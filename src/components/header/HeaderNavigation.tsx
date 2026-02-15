"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MegaMenu } from "@/components/mega-menu";
import { mainNavItemsWithMegaMenu, moreMegaMenu } from "@/components/mega-menu/navData";
import { createIcon } from "@/components/mega-menu/iconFactory";
import { cn } from "@/lib/utils";

import { User } from "@/types/api/auth";

interface HeaderNavigationProps {
	openMegaMenu: string | null;
	setOpenMegaMenu: (key: string | null) => void;
	isActiveRoute: (href: string) => boolean;
	mounted: boolean;
	user?: User | null;
}

export function HeaderNavigation({
	openMegaMenu,
	setOpenMegaMenu,
	isActiveRoute,
	mounted,
	user,
}: HeaderNavigationProps) {
	return (
		<nav 
			className="hidden lg:flex items-center gap-1 flex-1 justify-center" 
			suppressHydrationWarning
			aria-label="القائمة الرئيسية"
		>
			{mainNavItemsWithMegaMenu.map((item) => {
				const menuKey = item.href;
				const isOpen = openMegaMenu === menuKey;
				const isActive = mounted && isActiveRoute(item.href);
				
				// العناصر التي تحتوي على Mega Menu
				if (item.megaMenu && item.megaMenu.length > 0) {
					return (
						<div key={item.href} className="relative group" data-mega-menu-wrapper="true" suppressHydrationWarning>
							<MegaMenu
								categories={item.megaMenu}
								isOpen={isOpen}
								onClose={() => setOpenMegaMenu(null)}
								onOpen={() => {
									setOpenMegaMenu(menuKey);
								}}
								activeRoute={isActiveRoute}
								label={item.label}
								user={user}
								className={cn(
									"relative flex items-center gap-2 px-4 py-2.5 transition-all duration-300 !rounded-lg",
									"hover:bg-accent/80 hover:text-accent-foreground",
									isActive && "bg-primary/10 text-primary font-semibold shadow-sm",
									isOpen && "bg-primary/15 text-primary shadow-sm"
								)}
							/>
							{item.badge && mounted && (
								<motion.span
									initial={false}
									animate={{ scale: 1 }}
									style={{ transform: 'none' }}
									className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse z-10"
									suppressHydrationWarning
								>
									{item.badge}
								</motion.span>
							)}
							{isActive && !isOpen && (
								<motion.div
									className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
									layoutId={`activeIndicator-${item.href}`}
									initial={false}
									style={{ transform: 'none' }}
									transition={{ type: "spring", stiffness: 380, damping: 30 }}
								/>
							)}
						</div>
					);
				}
				
				// العناصر العادية بدون Mega Menu
				return (
					<motion.div
						key={item.href}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
					<Link
						href={item.href}
						prefetch={true}
						className={cn(
							"relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-accent/80 hover:text-accent-foreground group/nav",
							isActive &&
								"bg-primary/10 text-primary font-semibold shadow-sm"
						)}
					>
							{item.icon ? (
								<span className={cn(
									"transition-transform duration-300",
									"group-hover/nav:scale-110 group-hover/nav:rotate-3",
									mounted && isActive && "text-primary"
								)}>
									{createIcon(item.icon, "h-4 w-4")}
								</span>
							) : null}
							<span className="relative">{item.label}</span>
							{item.badge && mounted && (
								<motion.span
									initial={false}
									animate={{ scale: 1 }}
									style={{ transform: 'none' }}
									className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse"
									suppressHydrationWarning
								>
									{item.badge}
								</motion.span>
							)}
							{isActive && (
								<motion.div
									className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
									layoutId={`activeIndicator-${item.href}`}
									initial={false}
									style={{ transform: 'none' }}
									transition={{ type: "spring", stiffness: 380, damping: 30 }}
								/>
							)}
						</Link>
					</motion.div>
				);
			})}

			{/* قائمة "المزيد" مع Mega Menu */}
			<div className="relative group" data-mega-menu-wrapper="true" suppressHydrationWarning>
				<MegaMenu
					categories={moreMegaMenu}
					isOpen={openMegaMenu === "more"}
					onClose={() => setOpenMegaMenu(null)}
					onOpen={() => {
						setOpenMegaMenu("more");
					}}
					activeRoute={isActiveRoute}
					label="المزيد"
					user={user}
					className={cn(
						"relative flex items-center gap-2 px-4 py-2.5 transition-all duration-300 !rounded-lg",
						"hover:bg-accent/80 hover:text-accent-foreground",
						openMegaMenu === "more" && "bg-primary/15 text-primary shadow-sm"
					)}
				/>
			</div>
		</nav>
	);
}


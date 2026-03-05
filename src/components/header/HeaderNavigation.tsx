"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MegaMenu } from "@/components/mega-menu";
import { mainNavItemsWithMegaMenu, moreMegaMenu } from "@/components/mega-menu/navData";
import { createIcon } from "@/components/mega-menu/iconFactory";
import { cn } from "@/lib/utils";

import { User } from "@/types/user";

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
			aria-label="القائمة الرئيسية"
		>
			{mainNavItemsWithMegaMenu.map((item) => {
				const menuKey = item.href;
				const isOpen = openMegaMenu === menuKey;
				const isActive = mounted && isActiveRoute(item.href);
				
				// العناصر التي تحتوي على Mega Menu
				if (item.megaMenu && item.megaMenu.length > 0) {
					return (
						<div key={item.href} className="relative group" data-mega-menu-wrapper="true">
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
								"relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group/nav",
								"hover:bg-primary/5 hover:text-primary",
								isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
							)}
						>
							{item.icon ? (
								<span className={cn(
									"transition-all duration-500",
									"group-hover/nav:scale-125 group-hover/nav:rotate-12",
									mounted && isActive ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "opacity-70 group-hover/nav:opacity-100"
								)}>
									{createIcon(item.icon, "h-4.5 w-4.5")}
								</span>
							) : null}
							<span className="relative z-10">{item.label}</span>
							{item.badge && mounted && (
								<motion.span
									initial={{ scale: 0.5, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-primary text-[10px] text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20"
								>
									{item.badge}
								</motion.span>
							)}
							{isActive && (
								<motion.div
									className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
									layoutId="nav-bg"
									transition={{ type: "spring", stiffness: 400, damping: 30 }}
								/>
							)}
							{isActive && (
								<motion.div
									className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),0.8)]"
									layoutId="nav-indicator"
									transition={{ type: "spring", stiffness: 400, damping: 30 }}
								/>
							)}
						</Link>
					</motion.div>
				);
			})}

			{/* قائمة "المزيد" مع Mega Menu */}
			<div className="relative group" data-mega-menu-wrapper="true">
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


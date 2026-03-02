"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
	User,
	Settings,
	LogOut,
	LogIn,
	ChevronDown,
	BookOpen,
	Clock,
	TrendingUp,
	HelpCircle,
	Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LazyAvatar } from "@/components/ui/LazyAvatar";
import { motion } from "framer-motion";
// import removed

import { logger } from '@/lib/logger';

export function HeaderUserMenu() {
	const router = useRouter();
	const pathname = usePathname();
	const user: any = null;
	const logout = () => {};

	const handleLogout = useCallback(async () => {
		try {
			await logout();
			router.push("/");
		} catch (error) {
			logger.error("Logout error:", error);
		}
	}, [logout, router]);

	if (user) {
		return (
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
								<LazyAvatar
									src={user.avatar}
									alt={user.name || "User"}
									fallback={user.name
										?.split(" ")
										.map((n: any) => n[0])
										.join("")
										.toUpperCase() || user.email[0].toUpperCase()}
									size="md"
									priority={false}
									className="h-9 w-9 border-2 border-primary/20 transition-all duration-300 group-hover:border-primary/40 group-hover:scale-105"
								/>
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
									<LazyAvatar
										src={user.avatar}
										alt={user.name || "User"}
										fallback={user.name
											?.split(" ")
											.map((n: any) => n[0])
											.join("")
											.toUpperCase() || user.email[0].toUpperCase()}
										size="lg"
										priority={true}
										className="h-12 w-12 border-2 border-primary/20"
									/>
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
		);
	}

	if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
		return null;
	}

	return (
		<motion.div
			key="login-button"
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.2 }}
			className="hidden md:flex"
		>
			<Button variant="default" asChild className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-300">
				<Link href="/login" className="flex items-center gap-2">
					<LogIn className="h-4 w-4" />
					تسجيل الدخول
				</Link>
			</Button>
		</motion.div>
	);
}


"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Clock, TrendingUp, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/UserProvider";
import { safeGetItem } from "@/lib/safe-client-utils";

import { logger } from '@/lib/logger';

interface NavigationSuggestion {
	id: string;
	label: string;
	href: string;
	type: "recent" | "popular" | "recommended";
	icon: React.ReactNode;
	description?: string;
}

interface NavigationPage {
	path: string;
	label?: string;
	timestamp?: number;
}

export function SmartNavigationSuggestions() {
	const router = useRouter();
	const pathname = usePathname();
	const { user, mounted } = useAuth();
	const [suggestions, setSuggestions] = useState<NavigationSuggestion[]>([]);
	const [isOpen, setIsOpen] = useState(false);

	// Load navigation history
	useEffect(() => {
		if (!mounted) return;

		const loadSuggestions = () => {
			try {
				// Get recent pages
				const recentPages = safeGetItem<NavigationPage[]>("navigation_history", { fallback: [] });
				const popularPages = safeGetItem<NavigationPage[]>("popular_pages", { fallback: [] });

				const recent: NavigationSuggestion[] = Array.isArray(recentPages)
					? recentPages
							.slice(0, 5)
							.map((page: NavigationPage) => ({
								id: `recent-${page.path}`,
								label: page.label || page.path,
								href: page.path,
								type: "recent" as const,
								icon: <Clock className="h-4 w-4" />,
								description: "مستخدم مؤخراً",
							}))
					: [];

				const popular: NavigationSuggestion[] = Array.isArray(popularPages)
					? popularPages
							.slice(0, 5)
							.map((page: NavigationPage) => ({
								id: `popular-${page.path}`,
								label: page.label || page.path,
								href: page.path,
								type: "popular" as const,
								icon: <TrendingUp className="h-4 w-4" />,
								description: "شائع",
							}))
					: [];

				// Recommended based on user activity
				const recommended: NavigationSuggestion[] = user
					? [
							{
								id: "recommended-courses",
								label: "دورات موصى بها",
								href: "/courses?recommended=true",
								type: "recommended" as const,
								icon: <Star className="h-4 w-4" />,
								description: "مخصص لك",
							},
							{
								id: "recommended-time",
								label: "إدارة الوقت",
								href: "/time",
								type: "recommended" as const,
								icon: <Star className="h-4 w-4" />,
								description: "مخصص لك",
							},
					  ]
					: [];

				setSuggestions([...recent, ...popular, ...recommended].slice(0, 8));
			} catch (error) {
				logger.debug("Failed to load navigation suggestions:", error);
			}
		};

		loadSuggestions();

		// Update on navigation
		const handleNavigation = () => {
			loadSuggestions();
		};

		window.addEventListener("popstate", handleNavigation);
		return () => window.removeEventListener("popstate", handleNavigation);
	}, [mounted, user]);

	const handleSuggestionClick = (suggestion: NavigationSuggestion) => {
		router.push(suggestion.href);
		setIsOpen(false);

		// Track navigation
		try {
			const history = safeGetItem<NavigationPage[]>("navigation_history", { fallback: [] });
			const updated = [
				{ path: suggestion.href, label: suggestion.label, timestamp: Date.now() },
				...(Array.isArray(history) ? history : []).filter(
					(item: NavigationPage) => item.path !== suggestion.href
				),
			].slice(0, 10);
			localStorage.setItem("navigation_history", JSON.stringify(updated));
		} catch (e) {
			// Ignore
		}
	};

	if (!mounted || suggestions.length === 0) return null;

	const groupedSuggestions = useMemo(() => {
		const groups: Record<string, NavigationSuggestion[]> = {
			recent: [],
			popular: [],
			recommended: [],
		};

		suggestions.forEach((suggestion) => {
			groups[suggestion.type].push(suggestion);
		});

		return groups;
	}, [suggestions]);

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="hidden lg:flex items-center gap-2 h-9"
					aria-label="اقتراحات التنقل الذكية"
				>
					<TrendingUp className="h-4 w-4" />
					<span className="text-xs">اقتراحات</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72 p-0" sideOffset={8}>
				<DropdownMenuLabel className="px-4 py-3 flex items-center gap-2">
					<TrendingUp className="h-4 w-4 text-primary" />
					<span>اقتراحات التنقل</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<div className="max-h-[400px] overflow-y-auto p-2 space-y-4">
					{groupedSuggestions.recommended.length > 0 && (
						<div>
							<div className="text-xs font-semibold text-muted-foreground px-2 mb-2">
								موصى به لك
							</div>
							<div className="space-y-1">
								{groupedSuggestions.recommended.map((suggestion) => (
									<DropdownMenuItem
										key={suggestion.id}
										onClick={() => handleSuggestionClick(suggestion)}
										className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-accent"
									>
										<div className="flex items-center justify-center h-8 w-8 rounded-lg bg-yellow-500/10 text-yellow-600 shrink-0">
											{suggestion.icon}
										</div>
										<div className="flex-1 min-w-0 text-right">
											<div className="text-sm font-medium text-foreground">{suggestion.label}</div>
											{suggestion.description && (
												<div className="text-xs text-muted-foreground">{suggestion.description}</div>
											)}
										</div>
										<ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
									</DropdownMenuItem>
								))}
							</div>
						</div>
					)}

					{groupedSuggestions.recent.length > 0 && (
						<div>
							<div className="text-xs font-semibold text-muted-foreground px-2 mb-2">مستخدم مؤخراً</div>
							<div className="space-y-1">
								{groupedSuggestions.recent.map((suggestion) => (
									<DropdownMenuItem
										key={suggestion.id}
										onClick={() => handleSuggestionClick(suggestion)}
										className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-accent"
									>
										<div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
											{suggestion.icon}
										</div>
										<div className="flex-1 min-w-0 text-right">
											<div className="text-sm font-medium text-foreground">{suggestion.label}</div>
										</div>
										<ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
									</DropdownMenuItem>
								))}
							</div>
						</div>
					)}

					{groupedSuggestions.popular.length > 0 && (
						<div>
							<div className="text-xs font-semibold text-muted-foreground px-2 mb-2">شائع</div>
							<div className="space-y-1">
								{groupedSuggestions.popular.map((suggestion) => (
									<DropdownMenuItem
										key={suggestion.id}
										onClick={() => handleSuggestionClick(suggestion)}
										className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-accent"
									>
										<div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-500/10 text-green-600 shrink-0">
											{suggestion.icon}
										</div>
										<div className="flex-1 min-w-0 text-right">
											<div className="text-sm font-medium text-foreground">{suggestion.label}</div>
										</div>
										<ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
									</DropdownMenuItem>
								))}
							</div>
						</div>
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}


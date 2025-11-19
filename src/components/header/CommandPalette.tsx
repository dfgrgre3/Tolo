"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
	Search,
	Command,
	Home,
	BookOpen,
	Users,
	MessageSquare,
	FileText,
	Calendar,
	Settings,
	User,
	Bell,
	TrendingUp,
	HelpCircle,
	Zap,
	Clock,
	Award,
	BarChart3,
	ChevronRight,
	Sparkles,
	History,
	Star,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/UserProvider";
import { safeGetItem } from "@/lib/safe-client-utils";

interface CommandItem {
	id: string;
	label: string;
	description?: string;
	icon: React.ReactNode;
	action: () => void;
	keywords?: string[];
	category: string;
	shortcut?: string;
	popular?: boolean;
	recent?: boolean;
}

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { user } = useAuth();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const [recentItems, setRecentItems] = useState<string[]>([]);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const stored = safeGetItem("command_palette_recent", { fallback: [] });
		if (Array.isArray(stored)) {
			setRecentItems(stored);
		}
	}, []);

	// Load recent items from localStorage
	useEffect(() => {
		if (!mounted) return;
		const stored = safeGetItem("command_palette_recent", { fallback: [] });
		if (Array.isArray(stored)) {
			setRecentItems(stored);
		}
	}, [mounted]);

	// Focus input when dialog opens
	useEffect(() => {
		if (open && inputRef.current) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		} else {
			setSearchQuery("");
			setSelectedIndex(0);
		}
	}, [open]);

	// Build command items
	const allCommands = useMemo<CommandItem[]>(() => {
		const baseCommands: CommandItem[] = [
			{
				id: "home",
				label: "الصفحة الرئيسية",
				description: "العودة إلى الصفحة الرئيسية",
				icon: <Home className="h-4 w-4" />,
				action: () => router.push("/"),
				keywords: ["home", "رئيسية", "بداية"],
				category: "تنقل",
				shortcut: "⌘H",
			},
			{
				id: "courses",
				label: "الدورات",
				description: "عرض جميع الدورات",
				icon: <BookOpen className="h-4 w-4" />,
				action: () => router.push("/courses"),
				keywords: ["courses", "دورات", "كورسات"],
				category: "تعليم",
				popular: true,
			},
			{
				id: "teachers",
				label: "المعلمين",
				description: "استكشف المعلمين",
				icon: <Users className="h-4 w-4" />,
				action: () => router.push("/teachers"),
				keywords: ["teachers", "معلمين", "أساتذة"],
				category: "تعليم",
			},
			{
				id: "forum",
				label: "المنتدى",
				description: "مناقشات ومحادثات",
				icon: <MessageSquare className="h-4 w-4" />,
				action: () => router.push("/forum"),
				keywords: ["forum", "منتدى", "مناقشات"],
				category: "مجتمع",
			},
			{
				id: "schedule",
				label: "الجدول الزمني",
				description: "عرض جدولك الزمني",
				icon: <Calendar className="h-4 w-4" />,
				action: () => router.push("/schedule"),
				keywords: ["schedule", "جدول", "مواعيد"],
				category: "تنظيم",
				popular: true,
			},
			{
				id: "time",
				label: "إدارة الوقت",
				description: "تتبع وقتك الدراسي",
				icon: <Clock className="h-4 w-4" />,
				action: () => router.push("/time"),
				keywords: ["time", "وقت", "تتبع"],
				category: "إنتاجية",
				popular: true,
			},
			{
				id: "analytics",
				label: "الإحصائيات",
				description: "عرض إحصائياتك",
				icon: <BarChart3 className="h-4 w-4" />,
				action: () => router.push("/analytics"),
				keywords: ["analytics", "إحصائيات", "إحصائيات"],
				category: "تحليلات",
			},
			{
				id: "achievements",
				label: "الإنجازات",
				description: "عرض إنجازاتك",
				icon: <Award className="h-4 w-4" />,
				action: () => router.push("/achievements"),
				keywords: ["achievements", "إنجازات", "جوائز"],
				category: "إنجازات",
			},
			{
				id: "leaderboard",
				label: "لوحة المتصدرين",
				description: "ترتيب الطلاب",
				icon: <TrendingUp className="h-4 w-4" />,
				action: () => router.push("/leaderboard"),
				keywords: ["leaderboard", "متصدرين", "ترتيب"],
				category: "تنافس",
			},
		];

		if (user) {
			baseCommands.push(
				{
					id: "profile",
					label: "الملف الشخصي",
					description: "عرض وتعديل ملفك الشخصي",
					icon: <User className="h-4 w-4" />,
					action: () => router.push("/profile"),
					keywords: ["profile", "ملف", "شخصي"],
					category: "حساب",
					popular: true,
				},
				{
					id: "settings",
					label: "الإعدادات",
					description: "تعديل إعداداتك",
					icon: <Settings className="h-4 w-4" />,
					action: () => router.push("/settings"),
					keywords: ["settings", "إعدادات", "خيارات"],
					category: "حساب",
				},
				{
					id: "notifications",
					label: "الإشعارات",
					description: "عرض الإشعارات",
					icon: <Bell className="h-4 w-4" />,
					action: () => {
						const trigger = document.querySelector('[data-notification-trigger]') as HTMLElement;
						trigger?.click();
					},
					keywords: ["notifications", "إشعارات", "تنبيهات"],
					category: "حساب",
					shortcut: "⌘N",
				}
			);
		}

		// Mark recent items
		return baseCommands.map((cmd) => ({
			...cmd,
			recent: recentItems.includes(cmd.id),
		}));
	}, [user, router, recentItems]);

	// Filter commands based on search
	const filteredCommands = useMemo(() => {
		if (!searchQuery.trim()) {
			// Show popular and recent first when no search
			return allCommands.sort((a, b) => {
				if (a.recent && !b.recent) return -1;
				if (!a.recent && b.recent) return 1;
				if (a.popular && !b.popular) return -1;
				if (!a.popular && b.popular) return 1;
				return 0;
			});
		}

		const query = searchQuery.toLowerCase();
		return allCommands.filter((cmd) => {
			const matchesLabel = cmd.label.toLowerCase().includes(query);
			const matchesDescription = cmd.description?.toLowerCase().includes(query);
			const matchesKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(query));
			return matchesLabel || matchesDescription || matchesKeywords;
		});
	}, [searchQuery, allCommands]);

	// Group commands by category
	const groupedCommands = useMemo(() => {
		const groups: Record<string, CommandItem[]> = {};
		filteredCommands.forEach((cmd) => {
			if (!groups[cmd.category]) {
				groups[cmd.category] = [];
			}
			groups[cmd.category].push(cmd);
		});
		return groups;
	}, [filteredCommands]);

	// Handle command selection
	const handleSelect = useCallback(
		(command: CommandItem) => {
			command.action();
			onOpenChange(false);

			// Save to recent
			if (mounted) {
				const updated = [command.id, ...recentItems.filter((id) => id !== command.id)].slice(0, 5);
				setRecentItems(updated);
				try {
					localStorage.setItem("command_palette_recent", JSON.stringify(updated));
				} catch (e) {
					// Ignore
				}
			}
		},
		[onOpenChange, recentItems, mounted]
	);

	// Keyboard navigation
	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) => Math.max(prev - 1, 0));
			} else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
				e.preventDefault();
				handleSelect(filteredCommands[selectedIndex]);
			} else if (e.key === "Escape") {
				e.preventDefault();
				onOpenChange(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, selectedIndex, filteredCommands, handleSelect, onOpenChange]);

	// Scroll selected item into view
	useEffect(() => {
		if (listRef.current && selectedIndex >= 0) {
			const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
			}
		}
	}, [selectedIndex]);

	// Reset selected index when search changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [searchQuery]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" aria-label="لوحة الأوامر">
				<div className="flex flex-col">
					{/* Search Input */}
					<div className="flex items-center gap-3 border-b px-4 py-3">
						<Search className="h-5 w-5 text-muted-foreground shrink-0" />
						<Input
							ref={inputRef}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="اكتب للبحث أو اكتب أمراً... (⌘K)"
							className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-auto py-2"
							aria-label="بحث في لوحة الأوامر"
						/>
						{searchQuery && (
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 shrink-0"
								onClick={() => setSearchQuery("")}
								aria-label="مسح البحث"
							>
								<Command className="h-3 w-3" />
							</Button>
						)}
					</div>

					{/* Commands List */}
					<div className="max-h-[60vh] overflow-y-auto" ref={listRef}>
						{filteredCommands.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
								<Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
								<p className="text-sm font-medium text-foreground mb-1">لا توجد نتائج</p>
								<p className="text-xs text-muted-foreground">جرب البحث بكلمات مختلفة</p>
							</div>
						) : (
							<div className="p-2">
								{Object.entries(groupedCommands).map(([category, commands]) => (
									<div key={category} className="mb-4 last:mb-0">
										<div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											{category}
										</div>
										<div className="space-y-1">
											{commands.map((command, index) => {
												const globalIndex = filteredCommands.indexOf(command);
												const isSelected = globalIndex === selectedIndex;
												return (
													<motion.button
														key={command.id}
														onClick={() => handleSelect(command)}
														className={cn(
															"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-all",
															"hover:bg-accent focus:bg-accent focus:outline-none",
															isSelected && "bg-accent ring-2 ring-primary/20"
														)}
														whileHover={{ x: -2 }}
														whileTap={{ scale: 0.98 }}
													>
														<div
															className={cn(
																"flex items-center justify-center h-8 w-8 rounded-md shrink-0",
																"bg-primary/10 text-primary",
																isSelected && "bg-primary text-primary-foreground"
															)}
														>
															{command.icon}
														</div>
														<div className="flex-1 min-w-0 text-right">
															<div className="flex items-center gap-2">
																<span className="text-sm font-medium text-foreground">{command.label}</span>
																{command.recent && (
																	<History className="h-3 w-3 text-primary shrink-0" />
																)}
																{command.popular && (
																	<Star className="h-3 w-3 text-yellow-500 shrink-0" />
																)}
															</div>
															{command.description && (
																<p className="text-xs text-muted-foreground mt-0.5 truncate">{command.description}</p>
															)}
														</div>
														{command.shortcut && (
															<kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
																{command.shortcut}
															</kbd>
														)}
														<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
													</motion.button>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-1">
								<kbd className="h-4 px-1.5 rounded border bg-background">↑↓</kbd>
								<span>للتنقل</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="h-4 px-1.5 rounded border bg-background">↵</kbd>
								<span>للاختيار</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="h-4 px-1.5 rounded border bg-background">Esc</kbd>
								<span>للإغلاق</span>
							</div>
						</div>
						<div className="flex items-center gap-1 text-primary">
							<Sparkles className="h-3 w-3" />
							<span>Command Palette</span>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}


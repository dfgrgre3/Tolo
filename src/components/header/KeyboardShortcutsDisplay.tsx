"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Keyboard, X, Command, Search, Bell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Shortcut {
	id: string;
	label: string;
	keys: string[];
	category: string;
	description?: string;
}

const shortcuts: Shortcut[] = [
	{
		id: "command-palette",
		label: "فتح لوحة الأوامر",
		keys: ["⌘", "K"],
		category: "عام",
		description: "فتح لوحة الأوامر للبحث السريع",
	},
	{
		id: "search",
		label: "البحث",
		keys: ["⌘", "K"],
		category: "عام",
		description: "فتح البحث",
	},
	{
		id: "quick-actions",
		label: "إجراءات سريعة",
		keys: ["⌘", "⇧", "N"],
		category: "عام",
		description: "فتح قائمة الإجراءات السريعة",
	},
	{
		id: "notifications",
		label: "الإشعارات",
		keys: ["⌘", "N"],
		category: "عام",
		description: "فتح الإشعارات",
	},
	{
		id: "mobile-menu",
		label: "القائمة المحمولة",
		keys: ["Alt", "M"],
		category: "تنقل",
		description: "فتح/إغلاق القائمة المحمولة",
	},
	{
		id: "close",
		label: "إغلاق",
		keys: ["Esc"],
		category: "عام",
		description: "إغلاق النوافذ المنبثقة",
	},
	{
		id: "navigate-up",
		label: "التنقل لأعلى",
		keys: ["↑"],
		category: "تنقل",
		description: "في لوحة الأوامر",
	},
	{
		id: "navigate-down",
		label: "التنقل لأسفل",
		keys: ["↓"],
		category: "تنقل",
		description: "في لوحة الأوامر",
	},
	{
		id: "select",
		label: "اختيار",
		keys: ["↵"],
		category: "تنقل",
		description: "اختيار العنصر المحدد",
	},
];

export function KeyboardShortcutsDisplay() {
	const [isOpen, setIsOpen] = useState(false);

	// Keyboard shortcut to open
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "?") {
				e.preventDefault();
				setIsOpen(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
		if (!acc[shortcut.category]) {
			acc[shortcut.category] = [];
		}
		acc[shortcut.category].push(shortcut);
		return acc;
	}, {} as Record<string, Shortcut[]>);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="h-9 w-9"
				onClick={() => setIsOpen(true)}
				aria-label="عرض اختصارات لوحة المفاتيح"
				title="اختصارات لوحة المفاتيح (Ctrl+Shift+?)"
			>
				<Keyboard className="h-4 w-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Keyboard className="h-5 w-5 text-primary" />
							اختصارات لوحة المفاتيح
						</DialogTitle>
						<DialogDescription>
							استخدم هذه الاختصارات للتنقل السريع في المنصة
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-y-auto pr-2">
						<div className="space-y-6">
							{Object.entries(groupedShortcuts).map(([category, items]) => (
								<div key={category}>
									<h3 className="text-sm font-semibold text-foreground mb-3 px-1">
										{category}
									</h3>
									<div className="space-y-2">
										{items.map((shortcut, index) => (
											<motion.div
												key={shortcut.id}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: index * 0.05 }}
												className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
											>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium text-foreground">
														{shortcut.label}
													</div>
													{shortcut.description && (
														<div className="text-xs text-muted-foreground mt-0.5">
															{shortcut.description}
														</div>
													)}
												</div>
												<div className="flex items-center gap-1.5 mr-4">
													{shortcut.keys.map((key, keyIndex) => (
														<React.Fragment key={keyIndex}>
															<kbd className="inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-foreground shadow-sm">
																{key}
															</kbd>
															{keyIndex < shortcut.keys.length - 1 && (
																<span className="text-xs text-muted-foreground">+</span>
															)}
														</React.Fragment>
													))}
												</div>
											</motion.div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="border-t pt-4 mt-4 flex items-center justify-between text-xs text-muted-foreground">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-1">
								<Command className="h-3 w-3" />
								<span>⌘ = Cmd (Mac) أو Ctrl (Windows/Linux)</span>
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsOpen(false)}
							className="text-xs"
						>
							إغلاق
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}


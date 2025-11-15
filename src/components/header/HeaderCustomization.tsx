"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Settings, Layout, Minimize2, Maximize2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";

interface HeaderPreferences {
	compactMode: boolean;
	showProgress: boolean;
	showActivity: boolean;
	showSuggestions: boolean;
	layout: "default" | "minimal" | "extended";
}

const defaultPreferences: HeaderPreferences = {
	compactMode: false,
	showProgress: true,
	showActivity: true,
	showSuggestions: true,
	layout: "default",
};

export function HeaderCustomization() {
	const [preferences, setPreferences] = useState<HeaderPreferences>(defaultPreferences);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const stored = safeGetItem("header_preferences", { fallback: defaultPreferences });
		if (stored && typeof stored === "object") {
			setPreferences({ ...defaultPreferences, ...stored });
		}
	}, []);

	useEffect(() => {
		if (mounted) {
			safeSetItem("header_preferences", preferences);
			// Dispatch event for other components to listen
			window.dispatchEvent(
				new CustomEvent("header-preferences-changed", { detail: preferences })
			);
		}
	}, [preferences, mounted]);

	const updatePreference = useCallback(
		(key: keyof HeaderPreferences, value: HeaderPreferences[keyof HeaderPreferences]) => {
			setPreferences((prev) => ({ ...prev, [key]: value }));
		},
		[]
	);

	if (!mounted) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-9 w-9"
					aria-label="تخصيص الرأس"
					title="تخصيص الرأس"
				>
					<Settings className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64" sideOffset={8}>
				<DropdownMenuLabel className="flex items-center gap-2">
					<Layout className="h-4 w-4 text-primary" />
					<span>تخصيص الرأس</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<div className="p-1 space-y-1">
					<DropdownMenuCheckboxItem
						checked={preferences.compactMode}
						onCheckedChange={(checked) => updatePreference("compactMode", checked)}
						className="flex items-center gap-2"
					>
						{preferences.compactMode ? (
							<Minimize2 className="h-4 w-4" />
						) : (
							<Maximize2 className="h-4 w-4" />
						)}
						<span>وضع مدمج</span>
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={preferences.showProgress}
						onCheckedChange={(checked) => updatePreference("showProgress", checked)}
						className="flex items-center gap-2"
					>
						{preferences.showProgress ? (
							<Eye className="h-4 w-4" />
						) : (
							<EyeOff className="h-4 w-4" />
						)}
						<span>مؤشر التقدم</span>
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={preferences.showActivity}
						onCheckedChange={(checked) => updatePreference("showActivity", checked)}
						className="flex items-center gap-2"
					>
						{preferences.showActivity ? (
							<Eye className="h-4 w-4" />
						) : (
							<EyeOff className="h-4 w-4" />
						)}
						<span>النشاط الأخير</span>
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={preferences.showSuggestions}
						onCheckedChange={(checked) => updatePreference("showSuggestions", checked)}
						className="flex items-center gap-2"
					>
						{preferences.showSuggestions ? (
							<Eye className="h-4 w-4" />
						) : (
							<EyeOff className="h-4 w-4" />
						)}
						<span>اقتراحات التنقل</span>
					</DropdownMenuCheckboxItem>
				</div>

				<DropdownMenuSeparator />

				<div className="p-2">
					<div className="text-xs font-semibold text-muted-foreground mb-2 px-2">التخطيط</div>
					<div className="space-y-1">
						{(["default", "minimal", "extended"] as const).map((layout) => (
							<DropdownMenuItem
								key={layout}
								onClick={() => updatePreference("layout", layout)}
								className={cn(
									"flex items-center gap-2 p-2 rounded-lg cursor-pointer",
									"hover:bg-accent transition-colors",
									preferences.layout === layout && "bg-primary/10"
								)}
							>
								<Layout className="h-4 w-4" />
								<span className="text-sm">
									{layout === "default" && "افتراضي"}
									{layout === "minimal" && "بسيط"}
									{layout === "extended" && "موسع"}
								</span>
								{preferences.layout === layout && (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className="text-primary ml-auto"
									>
										✓
									</motion.div>
								)}
							</DropdownMenuItem>
						))}
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// Hook to use header preferences
export function useHeaderPreferences() {
	const [preferences, setPreferences] = useState<HeaderPreferences>(defaultPreferences);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const stored = safeGetItem("header_preferences", { fallback: defaultPreferences });
		if (stored && typeof stored === "object") {
			setPreferences({ ...defaultPreferences, ...stored });
		}

		const handleChange = (e: CustomEvent<HeaderPreferences>) => {
			setPreferences(e.detail);
		};

		window.addEventListener("header-preferences-changed", handleChange as EventListener);
		return () => {
			window.removeEventListener("header-preferences-changed", handleChange as EventListener);
		};
	}, []);

	return { preferences, mounted };
}


"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
	Search,
	X,
	Home,
	BookOpen,
	Users,
	MessageSquare,
	Calendar,
	Bell,
	TrendingUp,
	Clock,
	BarChart3,
	ChevronLeft,
	Sparkles,
	History,
	Star,
	Mic
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { safeGetItem } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CommandItem {
	id: string;
	label: string;
	description?: string;
	icon: LucideIcon;
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

interface SpeechRecognitionEvent extends Event {
	results: {
		[0]: {
			[0]: {
				transcript: string;
			};
		};
	};
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start(): void;
	stop(): void;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
}

declare global {
	interface Window {
		webkitSpeechRecognition: new () => SpeechRecognitionInstance;
		SpeechRecognition: new () => SpeechRecognitionInstance;
	}
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RECENT_STORAGE_KEY = "command_palette_recent";
const MAX_RECENT_ITEMS = 5;
const FOCUS_DELAY_MS = 100;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getInitialRecentItems(): string[] {
	if (typeof window === "undefined") return [];
	const stored = safeGetItem(RECENT_STORAGE_KEY, { fallback: [] });
	return Array.isArray(stored) ? stored : [];
}

function saveRecentItems(items: string[]): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
	} catch {
		// Ignore storage errors silently
	}
}

function createSpeechRecognition(): SpeechRecognitionInstance | null {
	if (typeof window === "undefined") return null;
	const RecognitionClass = window.webkitSpeechRecognition ?? window.SpeechRecognition;
	if (!RecognitionClass) return null;

	const instance = new RecognitionClass();
	instance.continuous = false;
	instance.interimResults = false;
	instance.lang = "ar-SA";
	return instance;
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const router = useRouter();
	const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [recentItems, setRecentItems] = useState<string[]>(getInitialRecentItems);
	const [isListening, setIsListening] = useState(false);

	// â”€â”€ Speech Recognition Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	useEffect(() => {
		const recognition = createSpeechRecognition();
		if (!recognition) return;

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			const transcript = event.results[0][0].transcript;
			setSearchQuery(transcript);
			setSelectedIndex(0);
			setIsListening(false);
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			logger.error("Speech recognition error:", event.error);
			setIsListening(false);
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognitionRef.current = recognition;

		return () => {
			recognition.stop();
			recognitionRef.current = null;
		};
	}, []);

	// â”€â”€ Auto-focus on open â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	useEffect(() => {
		if (!open || !inputRef.current) return;

		const timeout = window.setTimeout(() => {
			inputRef.current?.focus();
		}, FOCUS_DELAY_MS);

		return () => window.clearTimeout(timeout);
	}, [open]);

	// â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				recognitionRef.current?.stop();
				setIsListening(false);
				setSearchQuery("");
				setSelectedIndex(0);
			}
			onOpenChange(nextOpen);
		},
		[onOpenChange]
	);

	const handleSearchChange = useCallback((value: string) => {
		setSearchQuery(value);
		setSelectedIndex(0);
	}, []);

	const toggleListening = useCallback(() => {
		const recognition = recognitionRef.current;
		if (!recognition) return;

		if (isListening) {
			recognition.stop();
			setIsListening(false);
		} else {
			recognition.start();
			setIsListening(true);
		}
	}, [isListening]);

	// â”€â”€ Commands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const allCommands = useMemo<CommandItem[]>(() => {
		const baseCommands: CommandItem[] = [
			{
				id: "home",
				label: "Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©",
				description: "Ø§Ù„Ø¹ÙˆØ¯Ø© Ø¥Ù„Ù‰ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©",
				icon: Home,
				action: () => router.push("/"),
				keywords: ["home", "Ø±Ø¦ÙŠØ³ÙŠØ©", "Ø¨Ø¯Ø§ÙŠØ©"],
				category: "ØªÙ†Ù‚Ù„",
				shortcut: "Ctrl+H"
			},
			{
				id: "courses",
				label: "Ø§Ù„Ø¯ÙˆØ±Ø§Øª",
				description: "Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¯ÙˆØ±Ø§Øª",
				icon: BookOpen,
				action: () => router.push("/courses"),
				keywords: ["courses", "Ø¯ÙˆØ±Ø§Øª", "ÙƒÙˆØ±Ø³Ø§Øª"],
				category: "ØªØ¹Ù„ÙŠÙ…",
				popular: true
			},
			{
				id: "teachers",
				label: "Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†",
				description: "Ø§Ø³ØªÙƒØ´Ù Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†",
				icon: Users,
				action: () => router.push("/teachers"),
				keywords: ["teachers", "Ù…Ø¹Ù„Ù…ÙŠÙ†", "Ø£Ø³Ø§ØªØ°Ø©"],
				category: "ØªØ¹Ù„ÙŠÙ…"
			},
			{
				id: "forum",
				label: "Ø§Ù„Ù…Ù†ØªØ¯Ù‰",
				description: "Ù…Ù†Ø§Ù‚Ø´Ø§Øª ÙˆÙ…Ø­Ø§Ø¯Ø«Ø§Øª",
				icon: MessageSquare,
				action: () => router.push("/forum"),
				keywords: ["forum", "Ù…Ù†ØªØ¯Ù‰", "Ù…Ù†Ø§Ù‚Ø´Ø§Øª"],
				category: "Ù…Ø¬ØªÙ…Ø¹"
			},
			{
				id: "schedule",
				label: "Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø²Ù…Ù†ÙŠ",
				description: "Ø¹Ø±Ø¶ Ø¬Ø¯ÙˆÙ„Ùƒ Ø§Ù„Ø²Ù…Ù†ÙŠ",
				icon: Calendar,
				action: () => router.push("/schedule"),
				keywords: ["schedule", "Ø¬Ø¯ÙˆÙ„", "Ù…ÙˆØ§Ø¹ÙŠØ¯"],
				category: "ØªÙ†Ø¸ÙŠÙ…",
				popular: true
			},
			{
				id: "time",
				label: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª",
				description: "ØªØªØ¨Ø¹ ÙˆÙ‚ØªÙƒ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ",
				icon: Clock,
				action: () => router.push("/time"),
				keywords: ["time", "ÙˆÙ‚Øª", "ØªØªØ¨Ø¹"],
				category: "Ø¥Ù†ØªØ§Ø¬ÙŠØ©",
				popular: true
			},
			{
				id: "analytics",
				label: "Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª",
				description: "Ø¹Ø±Ø¶ Ø¥Ø­ØµØ§Ø¦ÙŠØ§ØªÙƒ",
				icon: BarChart3,
				action: () => router.push("/analytics"),
				keywords: ["analytics", "Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª"],
				category: "ØªØ­Ù„ÙŠÙ„Ø§Øª"
			},
			{
				id: "leaderboard",
				label: "Ù„ÙˆØ­Ø© Ø§Ù„Ù…ØªØµØ¯Ø±ÙŠÙ†",
				description: "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨",
				icon: TrendingUp,
				action: () => router.push("/leaderboard"),
				keywords: ["leaderboard", "Ù…ØªØµØ¯Ø±ÙŠÙ†", "ØªØ±ØªÙŠØ¨"],
				category: "ØªÙ†Ø§ÙØ³"
			},
			{
				id: "notifications",
				label: "Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª",
				description: "Ø¹Ø±Ø¶ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª",
				icon: Bell,
				action: () => {
					const trigger = document.querySelector(
						"[data-notification-trigger]"
					) as HTMLElement | null;
					trigger?.click();
				},
				keywords: ["notifications", "Ø¥Ø´Ø¹Ø§Ø±Ø§Øª", "ØªÙ†Ø¨ÙŠÙ‡Ø§Øª"],
				category: "Ø­Ø³Ø§Ø¨",
				shortcut: "Ctrl+N"
			}
		];

		return baseCommands.map((command) => ({
			...command,
			recent: recentItems.includes(command.id)
		}));
	}, [recentItems, router]);

	// â”€â”€ Filtering & Sorting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const filteredCommands = useMemo(() => {
		if (!searchQuery.trim()) {
			return [...allCommands].sort((a, b) => {
				if (a.recent && !b.recent) return -1;
				if (!a.recent && b.recent) return 1;
				if (a.popular && !b.popular) return -1;
				if (!a.popular && b.popular) return 1;
				return 0;
			});
		}

		const query = searchQuery.toLowerCase();
		return allCommands.filter((command) => {
			const matchesLabel = command.label.toLowerCase().includes(query);
			const matchesDescription = command.description?.toLowerCase().includes(query);
			const matchesKeywords = command.keywords?.some((kw) =>
				kw.toLowerCase().includes(query)
			);
			return matchesLabel || matchesDescription || matchesKeywords;
		});
	}, [allCommands, searchQuery]);

	const groupedCommands = useMemo(() => {
		const groups: Record<string, CommandItem[]> = {};
		for (const command of filteredCommands) {
			if (!groups[command.category]) groups[command.category] = [];
			groups[command.category]!.push(command);
		}
		return groups;
	}, [filteredCommands]);

	// â”€â”€ Selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const handleSelect = useCallback(
		(command: CommandItem) => {
			command.action();

			const updated = [
				command.id,
				...recentItems.filter((id) => id !== command.id)
			].slice(0, MAX_RECENT_ITEMS);

			setRecentItems(updated);
			saveRecentItems(updated);
			handleOpenChange(false);
		},
		[handleOpenChange, recentItems]
	);

	// â”€â”€ Keyboard Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) => Math.max(prev - 1, 0));
					break;
				case "Enter":
					if (filteredCommands[selectedIndex]) {
						e.preventDefault();
						handleSelect(filteredCommands[selectedIndex]);
					}
					break;
				case "Escape":
					e.preventDefault();
					handleOpenChange(false);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [filteredCommands, handleOpenChange, handleSelect, open, selectedIndex]);

	// â”€â”€ Scroll selected into view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	useEffect(() => {
		if (!listRef.current || selectedIndex < 0) return;

		const buttons = listRef.current.querySelectorAll<HTMLButtonElement>("[data-command-item]");
		buttons[selectedIndex]?.scrollIntoView({ block: "nearest" });
	}, [selectedIndex]);

	// â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const hasSpeechRecognition =
		typeof window !== "undefined" &&
		("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" aria-label="Ù„ÙˆØ­Ø© Ø§Ù„Ø£ÙˆØ§Ù…Ø±">
				<div className="flex flex-col">
					{/* Search Header */}
					<div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
						<Search className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
						<Input
							ref={inputRef}
							value={searchQuery}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† Ø¯Ø±ÙˆØ³ØŒ Ù…Ù„ÙØ§ØªØŒ Ø£Ùˆ Ø£ÙˆØ§Ù…Ø±..."
							className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-auto py-2"
							aria-label="Ø¨Ø­Ø« ÙÙŠ Ù„ÙˆØ­Ø© Ø§Ù„Ø£ÙˆØ§Ù…Ø±"
						/>

						<div className="flex items-center gap-2">
							{hasSpeechRecognition && (
								<Button
									variant="ghost"
									size="icon"
									className={cn(
										"h-8 w-8 rounded-full",
										isListening
											? "bg-red-500/10 text-red-500"
											: "hover:bg-primary/10 text-muted-foreground hover:text-primary"
									)}
									onClick={toggleListening}
									aria-label={isListening ? "Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø§Ø³ØªÙ…Ø§Ø¹" : "Ø¨Ø­Ø« ØµÙˆØªÙŠ"}
									aria-pressed={isListening}
								>
									<Mic className={cn("h-4 w-4", isListening && "fill-current")} aria-hidden="true" />
								</Button>
							)}

							{searchQuery && (
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0"
									onClick={() => handleSearchChange("")}
									aria-label="Ù…Ø³Ø­ Ø§Ù„Ø¨Ø­Ø«"
								>
									<X className="h-3 w-3" aria-hidden="true" />
								</Button>
							)}
						</div>
					</div>

					{/* Results List */}
					<div className="max-h-[60vh] overflow-y-auto" ref={listRef} role="listbox" aria-label="Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø¨Ø­Ø«">
						{filteredCommands.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
								<Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" aria-hidden="true" />
								<p className="text-sm font-medium text-foreground mb-1">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬</p>
								<p className="text-xs text-muted-foreground">Ø¬Ø±Ø¨ Ø§Ù„Ø¨Ø­Ø« Ø¨ÙƒÙ„Ù…Ø§Øª Ù…Ø®ØªÙ„ÙØ©</p>
							</div>
						) : (
							<div className="p-2">
								{Object.entries(groupedCommands).map(([category, commands]) => (
									<div key={category} className="mb-4 last:mb-0">
										<div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											{category}
										</div>
										<div className="space-y-1">
											{commands.map((command) => {
												const globalIndex = filteredCommands.indexOf(command);
												const isSelected = globalIndex === selectedIndex;
												const Icon = command.icon;

												return (
													<button
														key={command.id}
														data-command-item
														role="option"
														aria-selected={isSelected}
														onClick={() => handleSelect(command)}
														className={cn(
															"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start outline-none",
															"hover:bg-primary/5 focus:bg-primary/5 hover:ps-4",
															isSelected && "bg-primary/10 ps-4 ring-1 ring-primary/30"
														)}
													>
														<div
															className={cn(
																"flex items-center justify-center h-8 w-8 rounded-md shrink-0",
																isSelected
																	? "bg-primary text-primary-foreground scale-110"
																	: "bg-primary/10 text-primary"
															)}
														>
															<Icon className="h-4 w-4" aria-hidden="true" />
														</div>

														<div className="flex-1 min-w-0 text-start">
															<div className="flex items-center gap-2">
																<span className="text-sm font-medium text-foreground">
																	{command.label}
																</span>
																{command.recent && (
																	<History className="h-3 w-3 text-primary shrink-0" aria-label="ØªÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù…Ù‡ Ù…Ø¤Ø®Ø±Ù‹Ø§" />
																)}
																{command.popular && (
																	<Star className="h-3 w-3 text-yellow-500 shrink-0" aria-label="Ø´Ø§Ø¦Ø¹" />
																)}
															</div>
															{command.description && (
																<p className="text-xs text-muted-foreground mt-0.5 truncate">
																	{command.description}
																</p>
															)}
														</div>

														{command.shortcut && (
															<kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
																{command.shortcut}
															</kbd>
														)}

														<ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
													</button>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Footer Hints */}
					<div className="border-t border-border/50 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-1">
								<kbd className="h-4 px-1.5 rounded border bg-background">â†‘â†“</kbd>
								<span>Ù„Ù„ØªÙ†Ù‚Ù„</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="h-4 px-1.5 rounded border bg-background">Enter</kbd>
								<span>Ù„Ù„Ø§Ø®ØªÙŠØ§Ø±</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="h-4 px-1.5 rounded border bg-background">Esc</kbd>
								<span>Ù„Ù„Ø¥ØºÙ„Ø§Ù‚</span>
							</div>
						</div>
						<div className="flex items-center gap-1 text-primary">
							<Sparkles className="h-3 w-3" aria-hidden="true" />
							<span>Command Palette</span>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
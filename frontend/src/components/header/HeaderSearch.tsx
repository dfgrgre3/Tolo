"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Command, Mic, X, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";
import { errorService as errorManager } from "@/lib/logging/error-service";
import { toast } from "sonner";
import { useAdaptiveDebounce } from "@/hooks/use-adaptive-debounce";
import { registerServiceWorker, preCacheSearch } from "@/lib/service-worker";
import { useEfficiency } from "@/hooks/use-efficiency";
import { logger } from "@/lib/logger";
import { apiClient } from "@/lib/api/api-client";

export type { SearchResult, SearchScope } from "./_components/search-types";
import type { SearchResult, SearchScope } from "./_components/search-types";
import { DesktopSearchResultItem } from "./_components/DesktopSearchResultItem";
import { MobileSearchResultItem } from "./_components/MobileSearchResultItem";
import { SearchScopeFilters } from "./_components/SearchScopeFilters";
import { RecentSearches } from "./_components/RecentSearches";
import { SearchLoadingState } from "./_components/SearchLoadingState";
import { SearchNoResults } from "./_components/SearchNoResults";

// ─── Types & Constants ───────────────────────────────────────────

interface HeaderSearchProps {
	isMobile?: boolean;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

const CACHE_DURATION_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50;
const MAX_RECENT_SEARCHES = 5;
const VALID_SCOPES: SearchScope[] = ["all", "courses", "teachers", "forum", "exams"];

interface CacheEntry {
	results: SearchResult[];
	timestamp: number;
}

// ─── Component ───────────────────────────────────────────────────

export function HeaderSearch({ isMobile = false }: HeaderSearchProps) {
	const router = useRouter();
	const { isEfficiencyMode, setMode } = useEfficiency();

	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [searchScope, setSearchScope] = useState<SearchScope>("all");
	const [isSearching, setIsSearching] = useState(false);
	const [isVoiceActive, setIsVoiceActive] = useState(false);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const [mounted, setMounted] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

	// ── Mount ─────────────────────────────────────────────────────

	useEffect(() => {
		requestAnimationFrame(() => setMounted(true));
	}, []);

	// ── Service Worker Registration ───────────────────────────────

	useEffect(() => {
		if (!mounted || typeof window === "undefined") return;
		registerServiceWorker().catch(() => {});
	}, [mounted]);

	// ── Load Preferences ──────────────────────────────────────────

	useEffect(() => {
		if (!mounted) return;

		try {
			const stored = safeGetItem("header_recent_searches", { fallback: [] });
			if (Array.isArray(stored) && stored.length > 0) {
				setRecentSearches(stored.slice(0, MAX_RECENT_SEARCHES));
			}

			const scope = safeGetItem("header_search_scope", { fallback: "all" });
			if (scope && VALID_SCOPES.includes(scope as SearchScope)) {
				setSearchScope(scope as SearchScope);
			}
		} catch (error) {
			errorManager.handleError(
				error instanceof Error ? error : new Error("Failed to load search preferences"),
				{ showToast: false, logToConsole: true, severity: "low" },
				{ description: "تعذر تحميل تفضيلات البحث" }
			);
		}
	}, [mounted]);

	// ── Save Scope Preference ─────────────────────────────────────

	useEffect(() => {
		if (!mounted) return;
		try {
			safeSetItem("header_search_scope", searchScope);
		} catch (error) {
			logger.debug("Error saving search scope:", error);
		}
	}, [searchScope, mounted]);

	// ── Cache Management ──────────────────────────────────────────

	const updateCache = useCallback((key: string, results: SearchResult[]) => {
		cacheRef.current.set(key, { results, timestamp: Date.now() });

		if (cacheRef.current.size > MAX_CACHE_SIZE) {
			const firstKey = cacheRef.current.keys().next().value;
			if (firstKey) cacheRef.current.delete(firstKey);
		}
	}, []);

	// ── Recent Searches Management ────────────────────────────────

	const updateRecentSearches = useCallback(
		(query: string) => {
			if (!query) return;
			const filtered = recentSearches.filter((s) => s !== query);
			const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
			setRecentSearches(updated);
			try {
				safeSetItem("header_recent_searches", updated);
			} catch (error) {
				logger.debug("Error saving recent searches:", error);
			}
		},
		[recentSearches]
	);

	const clearRecentSearch = useCallback(
		(search: string) => {
			const updated = recentSearches.filter((s) => s !== search);
			setRecentSearches(updated);
			try {
				safeSetItem("header_recent_searches", updated);
			} catch (error) {
				logger.debug("Error clearing recent search:", error);
			}
		},
		[recentSearches]
	);

	const clearAllRecentSearches = useCallback(() => {
		setRecentSearches([]);
		try {
			safeSetItem("header_recent_searches", []);
		} catch (error) {
			logger.debug("Error clearing all recent searches:", error);
		}
	}, []);

	// ── Error Handling ────────────────────────────────────────────

	const handleSearchError = useCallback((error: unknown, query: string, scope: string) => {
		const message = error instanceof Error ? error.message : "فشل في جلب نتائج البحث";

		errorManager.handleError(
			error instanceof Error ? error : new Error(message),
			{
				showToast: true,
				logToConsole: true,
				severity: "medium",
				context: { source: "Header_Search", query, scope }
			},
			{
				title: "خطأ في البحث",
				description: "تعذر جلب نتائج البحث. يرجى المحاولة مرة أخرى.",
				action: {
					label: "إعادة المحاولة",
					onClick: () => {
						setSearchQuery("");
						setTimeout(() => setSearchQuery(query), 100);
					}
				},
				duration: 5000
			}
		);

		setSearchResults([]);
		setShowSuggestions(false);
	}, []);

	// ── Search Execution ──────────────────────────────────────────

	const performSearch = useCallback(
		async (rawQuery: string, scope: string) => {
			const query = rawQuery.trim();
			if (!query) {
				setSearchResults([]);
				setShowSuggestions(false);
				setSelectedIndex(-1);
				return;
			}

			const cacheKey = `${query}_${scope}`;
			const cached = cacheRef.current.get(cacheKey);

			if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
				setSearchResults(cached.results);
				setShowSuggestions(cached.results.length > 0);
				setIsSearching(false);
				return;
			}

			setIsSearching(true);
			try {
				const scopeMap: Record<SearchScope, string> = {
					all: "all",
					courses: "course",
					teachers: "teacher",
					forum: "all",
					exams: "resource"
				};
				const mappedScope = scopeMap[scope as SearchScope] || "all";
				const data = await apiClient.get<{ results: SearchResult[]; total: number }>(
					`/search?q=${encodeURIComponent(query)}&type=${mappedScope}&limit=8`
				);

				const results: SearchResult[] = data?.results || [];

				updateCache(cacheKey, results);
				setSearchResults(results);
				setShowSuggestions(results.length > 0);
				updateRecentSearches(query);

				if (typeof window !== "undefined" && "serviceWorker" in navigator) {
					preCacheSearch(query, scope).catch(() => {});
				}
			} catch (error) {
				handleSearchError(error, query, scope);
			} finally {
				setIsSearching(false);
			}
		},
		[updateCache, updateRecentSearches, handleSearchError]
	);

	// ── Debounced Search ──────────────────────────────────────────

	const { debouncedCallback: debouncedSearch } = useAdaptiveDebounce(
		((...args: unknown[]) => {
			const [query, scope] = args as [string, string];
			performSearch(query, scope);
		}) as (...args: unknown[]) => void,
		{ minDelay: 150, maxDelay: 600, initialDelay: 300 }
	);

	useEffect(() => {
		if (!mounted) return;
		debouncedSearch(searchQuery, searchScope);
	}, [searchQuery, searchScope, mounted, debouncedSearch]);

	// ── Result Click Handler ──────────────────────────────────────

	const handleResultClick = useCallback(
		(result: SearchResult) => {
			router.push(result.url);
			setSearchQuery("");
			setSearchResults([]);
			setSelectedIndex(-1);
			setShowSuggestions(false);
		},
		[router]
	);

	// ── Keyboard Navigation ───────────────────────────────────────

	useEffect(() => {
		if (!mounted) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				if (searchResults.length === 0) return;

				setSelectedIndex((prev) => {
					if (e.key === "ArrowDown") {
						return prev < searchResults.length - 1 ? prev + 1 : 0;
					}
					return prev > 0 ? prev - 1 : searchResults.length - 1;
				});
				return;
			}

			if (e.key === "Enter" && selectedIndex >= 0 && searchResults[selectedIndex]) {
				e.preventDefault();
				handleResultClick(searchResults[selectedIndex]);
				return;
			}

			if (e.key === "Escape") {
				setSearchQuery("");
				setSearchResults([]);
				setSelectedIndex(-1);
				setShowSuggestions(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [mounted, searchResults, selectedIndex, handleResultClick]);

	// ── Global Shortcut (Ctrl/Cmd+K) ──────────────────────────────

	useEffect(() => {
		if (!mounted || isMobile) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [mounted, isMobile]);

	// ── Form Submit ───────────────────────────────────────────────

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const query = searchQuery.trim();
			if (!query) return;

			const selected = selectedIndex >= 0 ? searchResults[selectedIndex] : searchResults[0];

			if (selected) {
				handleResultClick(selected);
			} else {
				toast.warning("لا توجد نتائج مطابقة لهذا البحث حالياً.");
			}
		},
		[handleResultClick, searchQuery, searchResults, selectedIndex]
	);

	// ── Recent Search Click ───────────────────────────────────────

	const handleRecentClick = useCallback((search: string) => {
		setSearchQuery(search);
		inputRef.current?.focus();
	}, []);

	// ── Voice Search ──────────────────────────────────────────────

	const handleVoiceSearch = useCallback(() => {
		if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
			toast.warning("البحث الصوتي غير متاح في هذا المتصفح.");
			return;
		}

		setIsVoiceActive(true);
		setTimeout(() => {
			setIsVoiceActive(false);
			toast.info("ميزة البحث الصوتي قيد التطوير.");
		}, 1000);
	}, []);

	// ── Efficiency Mode Toggle ────────────────────────────────────

	const toggleEfficiency = useCallback(() => {
		setMode(isEfficiencyMode ? "performance" : "lite");
	}, [isEfficiencyMode, setMode]);

	// ── Clear All ─────────────────────────────────────────────────

	const handleClearAll = useCallback(() => {
		setSearchQuery("");
		setSearchResults([]);
		setSearchScope("all");
		setSelectedIndex(-1);
		setShowSuggestions(false);
	}, []);

	// ── Render: Mobile ────────────────────────────────────────────

	if (isMobile) {
		return (
			<form onSubmit={handleSubmit} className="mb-4 space-y-3">
				<div className="flex gap-2">
					<Button
						type="button"
						size="icon"
						variant="ghost"
						onClick={toggleEfficiency}
						className={cn(
							"h-10 w-10 shrink-0 border border-border/50",
							isEfficiencyMode ? "text-primary bg-primary/10" : "text-muted-foreground"
						)}
						aria-label={isEfficiencyMode ? "تعطيل وضع الأداء المتوازن" : "تفعيل وضع الأجهزة الضعيفة"}
						aria-pressed={isEfficiencyMode}
					>
						{isEfficiencyMode ? (
							<Zap className="h-4 w-4" aria-hidden="true" />
						) : (
							<ZapOff className="h-4 w-4" aria-hidden="true" />
						)}
					</Button>

					<div className="relative flex-1">
						<Input
							type="search"
							placeholder="بحث..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="flex-1 pe-10 focus:ring-2 focus:ring-primary/20 bg-background border-border text-base"
							aria-label="بحث"
						/>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							onClick={(e) => {
								e.preventDefault();
								handleVoiceSearch();
							}}
							className={cn(
								"absolute start-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 touch-manipulation",
								isVoiceActive && "text-primary"
							)}
							aria-label="البحث الصوتي"
							aria-pressed={isVoiceActive}
						>
							<Mic className="h-4 w-4" aria-hidden="true" />
						</Button>
					</div>

					<Button
						type="submit"
						size="icon"
						className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm touch-manipulation"
						aria-label="تنفيذ البحث"
					>
						<Search className="h-4 w-4" aria-hidden="true" />
					</Button>
				</div>

				<SearchScopeFilters searchScope={searchScope} onScopeChange={setSearchScope} variant="mobile" />

				{recentSearches.length > 0 && (
					<RecentSearches
						searches={recentSearches}
						onSearchClick={handleRecentClick}
						onClearSearch={clearRecentSearch}
						onClearAll={clearAllRecentSearches}
						variant="mobile"
					/>
				)}

				{searchQuery.trim().length > 0 && (
					<div className="space-y-2 max-h-64 overflow-y-auto -webkit-overflow-scrolling: touch">
						{isSearching && <SearchLoadingState animated={false} className="py-4" />}
						{!isSearching && searchResults.length > 0 && (
							<>
								{searchResults.map((result) => (
									<MobileSearchResultItem
										key={result.id}
										result={result}
										onClick={handleResultClick}
									/>
								))}
							</>
						)}
						{!isSearching && searchResults.length === 0 && <SearchNoResults className="px-3" />}
					</div>
				)}
			</form>
		);
	}

	// ── Render: Desktop ───────────────────────────────────────────

	const hasQuery = searchQuery.trim().length > 0;

	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-3 relative">
			<div className="relative w-full">
				<div className="relative group/search-input">

					<Search
						className="absolute end-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within/search-input:text-primary transition-colors duration-300 pointer-events-none"
						aria-hidden="true"
					/>

					<Input
						ref={inputRef}
						id="header-search-input"
						type="search"
						placeholder="ابحث عن دورات، مدرسين، مواد..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => setShowSuggestions(true)}
						onBlur={() => setTimeout(() => {
							setShowSuggestions(false);
							setSelectedIndex(-1);
						}, 200)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setSearchQuery("");
								setSearchResults([]);
								setSelectedIndex(-1);
								setShowSuggestions(false);
							}
						}}
						className="w-full h-12 pe-11 ps-20 bg-background/50 hover:bg-background/80 focus:bg-background border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 text-base rounded-2xl transition-all duration-300 ease-out shadow-sm outline-none"
						aria-label="بحث في الموقع"
						aria-expanded={showSuggestions}
						aria-controls="search-results-panel"
						aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
						role="combobox"
						aria-autocomplete="list"
					/>

					<span
						className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/65 dark:bg-muted/20 border border-border/50 text-[10px] text-muted-foreground/80 pointer-events-none group-focus-within/search-input:opacity-0 transition-opacity duration-200"
						aria-hidden="true"
					>
						<Command className="h-3 w-3" />
						<span className="hidden lg:inline font-semibold">K</span>
					</span>

					<Button
						type="button"
						size="icon"
						variant="ghost"
						onClick={(e) => {
							e.preventDefault();
							handleVoiceSearch();
						}}
						className={cn(
							"absolute left-10 rtl:left-auto rtl:right-10 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-200",
							isVoiceActive && "text-primary bg-primary/10"
						)}
						aria-label="البحث الصوتي"
						aria-pressed={isVoiceActive}
					>
						<Mic className="h-4 w-4" aria-hidden="true" />
					</Button>

				</div>

				{/* Scope Filters */}
				{hasQuery && (
					<SearchScopeFilters searchScope={searchScope} onScopeChange={setSearchScope} variant="desktop" />
				)}

				{/* Results Dropdown */}
				{showSuggestions && (
					<div
						id="search-results-panel"
						role="listbox"
						aria-label="نتائج البحث"
						className={cn(
							"absolute top-full left-0 right-0 bg-background border border-border/60 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto",
							hasQuery ? "mt-14" : "mt-2"
						)}
					>
						{recentSearches.length > 0 && (
							<RecentSearches
								searches={recentSearches}
								onSearchClick={handleRecentClick}
								onClearSearch={clearRecentSearch}
								onClearAll={clearAllRecentSearches}
								variant="desktop"
							/>
						)}

						{isSearching && <SearchLoadingState />}

						{!isSearching && searchResults.length > 0 && (
							<div className="py-1">
								{searchResults.map((result, index) => (
									<DesktopSearchResultItem
										key={result.id}
										result={result}
										index={index}
										isSelected={selectedIndex === index}
										onSelect={setSelectedIndex}
										onClick={handleResultClick}
									/>
								))}
							</div>
						)}

						{!isSearching && searchResults.length === 0 && hasQuery && <SearchNoResults />}
					</div>
				)}
			</div>

			<Button
				type="submit"
				size="icon"
				variant="ghost"
				className="hover:bg-primary/15 hover:text-primary shadow-md h-12 w-12 rounded-2xl bg-primary/10"
				aria-label="تنفيذ البحث"
			>
				<Search className="h-5 w-5" aria-hidden="true" />
			</Button>

			{searchQuery && (
				<Button
					type="button"
					size="icon"
					variant="ghost"
					onClick={handleClearAll}
					className="hover:bg-destructive/15 hover:text-destructive h-12 w-12 rounded-2xl"
					aria-label="مسح البحث"
				>
					<X className="h-5 w-5" aria-hidden="true" />
				</Button>
			)}
		</form>
	);
}
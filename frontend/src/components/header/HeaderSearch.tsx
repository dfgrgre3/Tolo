"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

import { useRouter } from "next/navigation";

import {
	Search,
	Command,
	Mic,
	X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { m, AnimatePresence } from "framer-motion";

import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";

import { errorService as errorManager } from "@/lib/logging/error-service";
import { toast } from "sonner";
import { useAdaptiveDebounce } from "@/hooks/use-adaptive-debounce";
import { registerServiceWorker, preCacheSearch } from "@/lib/service-worker";
import { useEfficiency } from "@/hooks/use-efficiency";
import { Zap, ZapOff } from "lucide-react";

import { logger } from '@/lib/logger';

export type { SearchResult, SearchScope } from "./_components/search-types";
import type { SearchResult, SearchScope } from "./_components/search-types";
import { DesktopSearchResultItem } from "./_components/DesktopSearchResultItem";
import { MobileSearchResultItem } from "./_components/MobileSearchResultItem";
import { SearchScopeFilters } from "./_components/SearchScopeFilters";
import { RecentSearches } from "./_components/RecentSearches";
import { SearchLoadingState } from "./_components/SearchLoadingState";
import { SearchNoResults } from "./_components/SearchNoResults";

interface HeaderSearchProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function HeaderSearch({ isMobile = false, isOpen = false, onOpenChange }: HeaderSearchProps) {
  const router = useRouter();
  const { isEfficiencyMode, setMode } = useEfficiency();
  const toggleEfficiencyMode = () => {
    // Toggle between performance and lite (lightweight shortcut)
    setMode(isEfficiencyMode ? "performance" : "lite");
  };
  const [searchQuery, setSearchQuery] = useState("");

	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

	const [searchScope, setSearchScope] = useState<SearchScope>("all");

	const [isSearching, setIsSearching] = useState(false);

	const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);

	const [recentSearches, setRecentSearches] = useState<string[]>([]);

	const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
	const [mounted, setMounted] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const searchCacheRef = useRef<Map<string, { results: SearchResult[]; timestamp: number }>>(new Map());

	// Register service worker on mount
	useEffect(() => {

		if (mounted && typeof window !== "undefined") {

			registerServiceWorker().catch(() => {

				// Silently fail if service worker registration fails

			});

		}

	}, [mounted]);



	// Handle mount

	useEffect(() => {

		requestAnimationFrame(() => {

			setMounted(true);

		});

	}, []);



	// Load search preferences and recent searches on mount

	useEffect(() => {

		if (!mounted) return;

		try {

			const storedSearches = safeGetItem("header_recent_searches", { fallback: [] });

			if (Array.isArray(storedSearches) && storedSearches.length > 0) {

				setRecentSearches(storedSearches.slice(0, 5));

			}

			

			const storedScope = safeGetItem("header_search_scope", { fallback: "all" });

			if (storedScope && ["all", "courses", "teachers", "forum", "exams"].includes(storedScope)) {

				setSearchScope(storedScope as SearchScope);

			}

		} catch (error) {

			errorManager.handleError(

				error instanceof Error ? error : new Error("Failed to load search preferences"),

				{ showToast: false, logToConsole: true, severity: "low" },

				{ description: "تعذر تحميل تفضيلات البحث" }

			);

		}

	}, [mounted]);

	

	// Save search scope preference when it changes

	useEffect(() => {

		if (!mounted) return;

		try {

			safeSetItem("header_search_scope", searchScope);

		} catch (error) {

			logger.debug("Error saving search scope preference:", error);

		}

	}, [searchScope, mounted]);



	const updateSearchCache = useCallback((cacheKey: string, results: SearchResult[]) => {
		searchCacheRef.current.set(cacheKey, {
			results,
			timestamp: Date.now(),
		});
		
		if (searchCacheRef.current.size > 50) {
			const firstKey = searchCacheRef.current.keys().next().value;
			if (firstKey) {
				searchCacheRef.current.delete(firstKey);
			}
		}
	}, []);

	const updateRecentSearches = useCallback((query: string) => {
		if (query) {
			const filtered = recentSearches.filter((item) => item !== query);
			const updated = [query, ...filtered.slice(0, 4)];
			setRecentSearches(updated);
			try {
				safeSetItem("header_recent_searches", updated);
			} catch (error) {
				logger.debug("Error saving recent searches:", error);
			}
		}
	}, [recentSearches]);

	const clearRecentSearch = useCallback((searchToClear: string) => {
		const updated = recentSearches.filter((s) => s !== searchToClear);
		setRecentSearches(updated);
		try {
			safeSetItem("header_recent_searches", updated);
		} catch (error) {
			logger.debug("Error clearing recent search:", error);
		}
	}, [recentSearches]);

	const clearAllRecentSearches = useCallback(() => {
		setRecentSearches([]);
		try {
			safeSetItem("header_recent_searches", []);
		} catch (error) {
			logger.debug("Error clearing all recent searches:", error);
		}
	}, []);

	const handleSearchError = useCallback((error: unknown, query: string, scope: string) => {
		const errorMessage = error instanceof Error 
			? error.message 
			: "فشل في جلب نتائج البحث";
		
		errorManager.handleError(
			error instanceof Error ? error : new Error(errorMessage),
			{
				showToast: true,
				logToConsole: true,
				severity: "medium",
				context: {
					source: "Header_Search",
					query: query,
					scope: scope,
				}
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
		setShowSearchSuggestions(false);
	}, []);

	// Perform search with adaptive debounce
	const performSearch = useCallback(async (rawQuery: string, scope: string) => {
		const query = rawQuery.trim();
		if (!query) {
			setSearchResults([]);
			setShowSearchSuggestions(false);
			setSelectedResultIndex(-1);
			return;
		}

		const cacheKey = `${query}_${scope}`;
		const cached = searchCacheRef.current.get(cacheKey);
		
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			setSearchResults(cached.results);
			setShowSearchSuggestions(cached.results.length > 0);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		try {
			const response = await fetch(
				`/api/search?q=${encodeURIComponent(query)}&scope=${scope}&limit=8`
			);
			if (response.ok) {
				const data = await response.json();
				const results = data.results || [];
				
				updateSearchCache(cacheKey, results);
				
				setSearchResults(results);
				setShowSearchSuggestions(results.length > 0);
				
				// Pre-cache for service worker
				if (typeof window !== "undefined" && "serviceWorker" in navigator) {
					preCacheSearch(query, scope).catch(() => {});
				}
				
				updateRecentSearches(query);
			} else {
				setSearchResults([]);
				setShowSearchSuggestions(false);
			}
		} catch (error) {
			handleSearchError(error, query, scope);
		} finally {
			setIsSearching(false);
		}
	}, [updateSearchCache, updateRecentSearches, handleSearchError]);



	// Use adaptive debounce for search

	const { debouncedCallback: debouncedSearch } = useAdaptiveDebounce(

		((...args: unknown[]) => {

			const [query, scope] = args as [string, string];

			performSearch(query, scope);

		}) as (...args: unknown[]) => void,

		{

			minDelay: 150,

			maxDelay: 600,

			initialDelay: 300,

		}

	);



	// Trigger search when query or scope changes

	useEffect(() => {

		if (!mounted) return;

		debouncedSearch(searchQuery, searchScope);

		 

	}, [searchQuery, searchScope, mounted]);






	const handleSearchResultClick = useCallback((result: SearchResult) => {

		router.push(result.url);

		setSearchQuery("");

		setSearchResults([]);

		setSelectedResultIndex(-1);

	}, [router]);



	// Keyboard shortcuts and navigation

	useEffect(() => {

		if (!mounted) return;



		const handleKeyDown = (e: KeyboardEvent) => {

			if (e.key === "ArrowDown" || e.key === "ArrowUp") {

				e.preventDefault();

				if (searchResults.length > 0) {

					if (e.key === "ArrowDown") {

						setSelectedResultIndex((prev) => 

							prev < searchResults.length - 1 ? prev + 1 : 0

						);

					} else {

						setSelectedResultIndex((prev) => 

							prev > 0 ? prev - 1 : searchResults.length - 1

						);

					}

				}

				return;

			}



			if (e.key === "Enter" && selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {

				e.preventDefault();

				handleSearchResultClick(searchResults[selectedResultIndex]);

				return;

			}



			if (e.key === "Escape") {

				setSearchQuery("");

				setSearchResults([]);

				setSelectedResultIndex(-1);

			}

		};



		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);

	}, [mounted, searchResults, selectedResultIndex, handleSearchResultClick]);



	// Global keyboard shortcuts (Ctrl+K / Cmd+K)

	useEffect(() => {

		if (!mounted || isMobile) return;



		const handleKeyDown = (e: KeyboardEvent) => {

			if ((e.ctrlKey || e.metaKey) && e.key === "k") {

				e.preventDefault();

				searchInputRef.current?.focus();

			}

		};



		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);

	}, [mounted, isMobile]);



	const handleSearch = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		const normalizedQuery = searchQuery.trim();
		if (!normalizedQuery) return;

		const selectedResult =
			selectedResultIndex >= 0 ? searchResults[selectedResultIndex] : searchResults[0];

		if (selectedResult) {
			handleSearchResultClick(selectedResult);
			return;
		}

		toast.warning("لا توجد نتائج مطابقة لهذا البحث حالياً.");
	}, [handleSearchResultClick, searchQuery, searchResults, selectedResultIndex]);


	const handleRecentSearchClick = useCallback((search: string) => {

		setSearchQuery(search);

		searchInputRef.current?.focus();

	}, []);



	const handleVoiceSearch = useCallback(() => {

		if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {

			toast.warning("البحث الصوتي غير متاح في هذا المتصفح. يرجى استخدام متصفح يدعم Web Speech API.");

			return;

		}



		setIsVoiceSearchActive(true);

		setTimeout(() => {

			setIsVoiceSearchActive(false);

			toast.warning("ميزة البحث الصوتي قيد التطوير. سيتم تفعيلها قريباً!");

		}, 1000);

	}, []);



	if (isMobile) {
		return (
			<form onSubmit={handleSearch} className="mb-4 space-y-3">
	
				<div className="flex gap-2">
					<Button
						type="button"
						size="icon"
						variant="ghost"
						onClick={toggleEfficiencyMode}
						className={cn(
							"h-10 w-10 shrink-0 border border-border/50",
							isEfficiencyMode ? "text-primary bg-primary/10" : "text-muted-foreground"
						)}
						title={isEfficiencyMode ? "تعطيل وضع الأداء المتوازن" : "تفعيل وضع الأجهزة الضعيفة"}
					>
						{isEfficiencyMode ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
					</Button>
					<div className="relative flex-1">
						<Input
							type="text"
							placeholder="بحث..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="flex-1 pr-10 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 transition-all bg-background dark:bg-background border-border dark:border-border/70 text-base"
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
								"absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 touch-manipulation",
								isVoiceSearchActive && "text-primary animate-pulse"
							)}
							title="البحث الصوتي"
						>
							<Mic className="h-4 w-4" />
						</Button>
					</div>
					<Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm touch-manipulation">
						<Search className="h-4 w-4" />
					</Button>
				</div>
	
				{/* Mobile Search Scope Filters */}
				<SearchScopeFilters searchScope={searchScope} onScopeChange={setSearchScope} variant="mobile" />
	
				{/* Mobile Recent Searches */}
				{recentSearches.length > 0 && (
					<RecentSearches
						searches={recentSearches}
						onSearchClick={handleRecentSearchClick}
						onClearSearch={clearRecentSearch}
						onClearAll={clearAllRecentSearches}
						variant="mobile"
					/>
				)}
	
				{/* Mobile Search Results */}
				{searchQuery.trim().length > 0 && (
					<div className="space-y-2 max-h-64 overflow-y-auto -webkit-overflow-scrolling: touch">
						{isSearching && <SearchLoadingState animated={false} className="py-4" />}
						{!isSearching && searchResults.length > 0 && searchResults.map((result) => (
							<MobileSearchResultItem
								key={result.id}
								result={result}
								onClick={handleSearchResultClick}
							/>
						))}
						{!isSearching && searchResults.length === 0 && (
							<SearchNoResults className="px-3" />
						)}
					</div>
				)}
	
			</form>
		);
	}


	return (

		<m.form

			onSubmit={handleSearch}
			className="flex items-center gap-3 relative"
		>

			<m.div

				className="relative w-full"

			>

				<div className="relative group/search-input">
					<Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 group-focus-within/search-input:text-primary group-focus-within/search-input:scale-105 transition-all duration-300 pointer-events-none" />

					<Input
						ref={searchInputRef}
						type="text"
						placeholder="ابحث عن دورات، مدرسين، مواد..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => setShowSearchSuggestions(true)}
						className="w-full h-12 pr-11 pl-20 transition-all duration-300 focus:ring-4 focus:ring-primary/10 focus:border-primary/50 bg-background/90 dark:bg-background/90 backdrop-blur-xl border-border/50 dark:border-border/60 text-base rounded-2xl shadow-inner focus:shadow-md focus:bg-background"
						onBlur={() => {

							setTimeout(() => {

								setShowSearchSuggestions(false);

								setSelectedResultIndex(-1);

							}, 200);

						}}

						onKeyDown={(e) => {

							if (e.key === "Escape") {

								setSearchQuery("");

								setSearchResults([]);

								setSelectedResultIndex(-1);

							}

						}}

					/>

					<span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/50 text-[10px] text-muted-foreground/70 pointer-events-none">

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

							"absolute left-9 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all rounded-xl",

							isVoiceSearchActive && "text-primary animate-pulse"

						)}

						title="البحث الصوتي"

					>

						<Mic className="h-4 w-4" />

					</Button>

				</div>

				

				{/* Search Scope Filters */}

				{searchQuery.trim().length > 0 && (
					<SearchScopeFilters searchScope={searchScope} onScopeChange={setSearchScope} variant="desktop" />
				)}

				{/* Instant Search Results Dropdown */}

				<AnimatePresence>

					{showSearchSuggestions && (

						<m.div

							initial={{ opacity: 0, y: -10, scale: 0.95 }}

							animate={{ opacity: 1, y: 0, scale: 1 }}

							exit={{ opacity: 0, y: -10, scale: 0.95 }}

							transition={{ duration: 0.2, ease: "easeOut" }}

							className={cn(

								"absolute top-full left-0 right-0 bg-background/95 dark:bg-background border border-border/60 dark:border-border/80 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto backdrop-blur-md",

								searchQuery.trim().length > 0 ? "mt-14" : "mt-2"

							)}

						>

							{/* Recent Searches */}
							{recentSearches.length > 0 && (
								<RecentSearches
									searches={recentSearches}
									onSearchClick={handleRecentSearchClick}
									onClearSearch={clearRecentSearch}
									onClearAll={clearAllRecentSearches}
									variant="desktop"
								/>
							)}

							{/* Loading State */}

							{isSearching && <SearchLoadingState />}

							{/* Search Results */}

							{!isSearching && searchResults.length > 0 && (

								<div className="py-1">

									{searchResults.map((result, index) => (
										<DesktopSearchResultItem
											key={result.id}
											result={result}
											index={index}
											isSelected={selectedResultIndex === index}
											onSelect={setSelectedResultIndex}
											onClick={handleSearchResultClick}
										/>
									))}

								</div>

							)}

							{/* No Results */}

							{!isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
								<SearchNoResults />
							)}

						</m.div>

					)}

				</AnimatePresence>

			</m.div>

			<Button type="submit" size="icon" variant="ghost" className="hover:bg-primary/15 hover:text-primary transition-all duration-300 shadow-md h-12 w-12 rounded-2xl bg-primary/10 hover:bg-primary/20">

				<Search className="h-5 w-5" />

			</Button>

			{searchQuery && (
				<Button

					type="button"

					size="icon"

					variant="ghost"

					onClick={() => {

						setSearchQuery("");

						setSearchResults([]);

						setSearchScope("all");

					}}

					className="hover:bg-destructive/15 hover:text-destructive transition-all duration-300 h-12 w-12 rounded-2xl"

				>

					<X className="h-5 w-5" />

				</Button>
			)}

		</m.form>

	);

}

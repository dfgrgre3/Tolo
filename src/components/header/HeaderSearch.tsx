"use client";



import React, { useState, useEffect, useRef, useCallback } from "react";

import { useRouter } from "next/navigation";

import {

	Search,

	Command,

	Mic,

	X,

	Clock,

	BookOpen,

	Users,

	MessageSquare,

	FileText,

	ChevronDown,

} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";

import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";

import errorManager from "@/services/ErrorManager";
import { toast } from "sonner";
import { useAdaptiveDebounce } from "@/hooks/use-adaptive-debounce";
import { registerServiceWorker, preCacheSearch } from "@/lib/service-worker";


import { logger } from '@/lib/logger';



interface HeaderSearchProps {
	isMobile?: boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function HeaderSearch({ isMobile = false }: HeaderSearchProps) {
	const router = useRouter();
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	interface SearchResult {
		id: string;
		title: string;
		url: string;

		type: string;

		description?: string;

		category?: string;

	}



	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

	const [searchScope, setSearchScope] = useState<"all" | "courses" | "teachers" | "forum" | "exams">("all");

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

				setSearchScope(storedScope as "all" | "courses" | "teachers" | "forum" | "exams");

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



	// Perform search with adaptive debounce

	const performSearch = useCallback(async (query: string, scope: string) => {

		if (!query.trim()) {

			setSearchResults([]);

			setShowSearchSuggestions(false);

			setSelectedResultIndex(-1);

			return;

		}



		const cacheKey = `${query.trim()}_${scope}`;

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

				`/api/search?q=${encodeURIComponent(query.trim())}&scope=${scope}&limit=8`

			);

			if (response.ok) {

				const data = await response.json();

				const results = data.results || [];

				

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

				

				setSearchResults(results);

				setShowSearchSuggestions(results.length > 0);

				

				// Pre-cache for service worker

				if (typeof window !== "undefined" && "serviceWorker" in navigator) {

					preCacheSearch(query.trim(), scope).catch(() => {

						// Silently fail

					});

				}

				

				if (query.trim() && !recentSearches.includes(query.trim())) {

					const updated = [query.trim(), ...recentSearches.slice(0, 4)];

					setRecentSearches(updated);

					try {

						safeSetItem("header_recent_searches", updated);

					} catch (error) {

						logger.debug("Error saving recent searches:", error);

					}

				}

			} else {

				setSearchResults([]);

				setShowSearchSuggestions(false);

			}

		} catch (error) {

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

						query: query.trim(),

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

							setTimeout(() => setSearchQuery(query.trim()), 100);

						}

					},

					duration: 5000

				}

			);

			

			setSearchResults([]);

			setShowSearchSuggestions(false);

		} finally {

			setIsSearching(false);

		}

	}, [recentSearches]);



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



	// Focus search input when opened

	useEffect(() => {

		if (!mounted || !isSearchOpen || !searchInputRef.current) return;

		

		const timer = setTimeout(() => {

			searchInputRef.current?.focus();

		}, 100);

		

		return () => clearTimeout(timer);

	}, [isSearchOpen, mounted]);



	const handleSearchResultClick = useCallback((result: SearchResult) => {

		router.push(result.url);

		setIsSearchOpen(false);

		setSearchQuery("");

		setSearchResults([]);

		setSelectedResultIndex(-1);

	}, [router]);



	// Keyboard shortcuts and navigation

	useEffect(() => {

		if (!mounted || !isSearchOpen) return;



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

				setIsSearchOpen(false);

				setSearchQuery("");

				setSearchResults([]);

				setSelectedResultIndex(-1);

			}

		};



		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);

	}, [mounted, isSearchOpen, searchResults, selectedResultIndex, handleSearchResultClick]);



	// Global keyboard shortcuts (Ctrl+K / Cmd+K)

	useEffect(() => {

		if (!mounted || isMobile) return;



		const handleKeyDown = (e: KeyboardEvent) => {

			if ((e.ctrlKey || e.metaKey) && e.key === "k") {

				e.preventDefault();

				setIsSearchOpen(true);

			}

		};



		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);

	}, [mounted, isSearchOpen, isMobile]);



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
				<div className="flex items-center gap-1 flex-wrap">
					{(["all", "courses", "teachers", "forum", "exams"] as const).map((scope) => {
						const icons = {
							all: Search,
							courses: BookOpen,
							teachers: Users,
							forum: MessageSquare,
							exams: FileText,
						};
						const labels = {
							all: "الكل",
							courses: "مواد",
							teachers: "معلمين",
							forum: "منتدى",
							exams: "اختبارات",
						};
						const Icon = icons[scope];
						return (
							<button
								key={scope}
								type="button"
								onClick={() => setSearchScope(scope)}
								className={cn(
									"flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all dark:transition-all touch-manipulation",
									searchScope === scope
										? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"
										: "bg-accent dark:bg-accent/50 hover:bg-accent/80 dark:hover:bg-accent/70 text-muted-foreground dark:text-muted-foreground"
								)}
							>
								<Icon className="h-3 w-3" />
								<span className="text-xs">{labels[scope]}</span>
							</button>
						);
					})}
				</div>

				{/* Mobile Recent Searches */}
				{searchQuery.trim().length === 0 && recentSearches.length > 0 && (
					<div className="space-y-2">
						<div className="px-2 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
							<Clock className="h-3.5 w-3.5" />
							البحث الأخير
						</div>
						{recentSearches.map((search, index) => (
							<button
								key={index}
								type="button"
								onClick={() => handleRecentSearchClick(search)}
								className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-accent dark:hover:bg-accent/80 transition-colors flex items-center gap-2.5 border border-border/50 dark:border-border/50 touch-manipulation"
							>
								<Search className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
								<span className="flex-1 text-sm">{search}</span>
							</button>
						))}
					</div>
				)}

				

				{/* Mobile Search Results */}
				{searchQuery.trim().length > 0 && (
					<div className="space-y-2 max-h-64 overflow-y-auto -webkit-overflow-scrolling: touch">
						{isSearching && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="flex items-center justify-center py-4"
							>
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary dark:border-primary" />
								<span className="mr-2 text-sm text-muted-foreground dark:text-muted-foreground">جاري البحث...</span>
							</motion.div>
						)}
						{!isSearching && searchResults.length > 0 && searchResults.map((result) => {
							const IconComponent = result.type === "course" ? BookOpen :
								result.type === "teacher" ? Users :
								result.type === "forum" ? MessageSquare :
								FileText;
							
							return (
								<motion.button
									key={result.id}
									initial={{ opacity: 0, x: 10 }}
									animate={{ opacity: 1, x: 0 }}
									type="button"
									onClick={() => {
										handleSearchResultClick(result);
									}}
									className="w-full text-right px-3 py-3 rounded-lg hover:bg-accent dark:hover:bg-accent/80 transition-all duration-150 flex items-center gap-2.5 border border-border/50 dark:border-border/50 active:scale-95 touch-manipulation"
								>
									<div className={cn(
										"p-2 rounded-lg transition-all duration-150",
										result.type === "course" && "bg-blue-100 dark:bg-blue-900/40",
										result.type === "teacher" && "bg-orange-100 dark:bg-orange-900/40",
										result.type === "forum" && "bg-green-100 dark:bg-green-900/40",
										result.type === "exam" && "bg-purple-100 dark:bg-purple-900/40"
									)}>
										<IconComponent className={cn(
											"h-4 w-4 transition-colors",
											result.type === "course" && "text-blue-600 dark:text-blue-400",
											result.type === "teacher" && "text-orange-600 dark:text-orange-400",
											result.type === "forum" && "text-green-600 dark:text-green-400",
											result.type === "exam" && "text-purple-600 dark:text-purple-400"
										)} />
									</div>
									<div className="flex-1 text-right min-w-0">
										<p className="text-sm font-medium truncate dark:text-foreground">{result.title}</p>
										{result.description && (
											<p className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5">
												{result.description}
											</p>
										)}
										{result.category && (
											<span className="inline-block mt-1 text-xs text-muted-foreground dark:text-muted-foreground px-2 py-0.5 rounded-md bg-muted/50 dark:bg-muted/30">
												{result.category}
											</span>
										)}
									</div>
								</motion.button>
							);
						})}
						{!isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="px-3 py-6 text-center"
							>
								<Search className="h-8 w-8 text-muted-foreground dark:text-muted-foreground mx-auto mb-2 opacity-50" />
								<p className="text-sm text-muted-foreground dark:text-muted-foreground">لا توجد نتائج</p>
								<p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">جرب مصطلحات بحث مختلفة</p>
							</motion.div>
						)}
					</div>
				)}

			</form>

		);

	}



	return (

		<AnimatePresence>

			{isSearchOpen ? (

				<motion.form

					initial={{ width: 0, opacity: 0 }}

					animate={{ width: "auto", opacity: 1 }}
					exit={{ width: 0, opacity: 0 }}
					transition={{ duration: 0.25, ease: "easeInOut" }}
					onSubmit={handleSearch}
					className="flex items-center gap-2 absolute top-1/2 -translate-y-1/2 left-2 right-2 md:relative md:translate-y-0 md:left-auto md:right-auto md:top-auto bg-background/95 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none p-2 md:p-0 rounded-xl md:rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:shadow-none z-[100] md:z-auto border border-border/50 md:border-transparent origin-right"
				>

					<motion.div

						initial={{ scale: 0.9 }}

						animate={{ scale: 1 }}

						className="relative"

					>

						<div className="relative">

							<Input
								ref={searchInputRef}
								type="text"
								placeholder="بحث..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onFocus={() => setShowSearchSuggestions(searchQuery.trim().length > 0 && searchResults.length > 0)}
								className="w-full md:w-80 h-10 md:h-10 pr-24 pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/30 dark:focus:ring-primary/50 focus:border-primary/50 dark:focus:border-primary/70 bg-background/90 dark:bg-background/95 backdrop-blur-sm border-border/50 dark:border-border/70 text-base md:text-sm"
								onBlur={() => {

									setTimeout(() => {

										setShowSearchSuggestions(false);

										setSelectedResultIndex(-1);

										if (!searchQuery) {

											setIsSearchOpen(false);

										}

									}, 200);

								}}

								onKeyDown={(e) => {

									if (e.key === "Escape") {

										setIsSearchOpen(false);

										setSearchQuery("");

										setSearchResults([]);

										setSelectedResultIndex(-1);

									}

								}}

							/>

							<span className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">

								<Command className="h-3 w-3" />

								<span className="hidden lg:inline">K</span>

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

									"absolute left-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary transition-all",

									isVoiceSearchActive && "text-primary animate-pulse"

								)}

								title="البحث الصوتي"

							>

								<Mic className="h-3.5 w-3.5" />

							</Button>

						</div>

						

						{/* Search Scope Filters */}

						{searchQuery.trim().length > 0 && (

							<div className="absolute top-full left-0 right-0 mt-1 flex items-center gap-1 p-1 bg-background/95 dark:bg-background/95 backdrop-blur-md border border-border/50 dark:border-border/50 rounded-lg shadow-lg dark:shadow-xl z-40 pointer-events-auto">

								{(["all", "courses", "teachers", "forum", "exams"] as const).map((scope) => {

									const icons = {

										all: Search,

										courses: BookOpen,

										teachers: Users,

										forum: MessageSquare,

										exams: FileText,

									};

									const labels = {

										all: "الكل",

										courses: "مواد",

										teachers: "معلمين",

										forum: "منتدى",

										exams: "اختبارات",

									};

									const Icon = icons[scope];

									return (

										<button

											key={scope}

											type="button"

											onClick={() => setSearchScope(scope)}

											className={cn(

												"flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all dark:transition-all",

												searchScope === scope

													? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"

													: "hover:bg-accent dark:hover:bg-accent/80 text-muted-foreground dark:text-muted-foreground"

											)}

											title={labels[scope]}

										>

											<Icon className="h-3 w-3" />

											<span className="hidden lg:inline">{labels[scope]}</span>

										</button>

									);

								})}

							</div>

						)}



						{/* Instant Search Results Dropdown */}

						<AnimatePresence>

							{(showSearchSuggestions || (searchQuery.trim().length === 0 && recentSearches.length > 0)) && (

								<motion.div

									initial={{ opacity: 0, y: -10, scale: 0.95 }}

									animate={{ opacity: 1, y: 0, scale: 1 }}

									exit={{ opacity: 0, y: -10, scale: 0.95 }}

									transition={{ duration: 0.2, ease: "easeOut" }}

									className={cn(

										"absolute top-full left-0 right-0 bg-background dark:bg-background border border-border dark:border-border/80 rounded-lg shadow-xl dark:shadow-2xl z-50 max-h-96 overflow-y-auto backdrop-blur-sm dark:backdrop-blur-md",

										searchQuery.trim().length > 0 ? "mt-14" : "mt-2"

									)}

								>

									{/* Recent Searches */}

									{searchQuery.trim().length === 0 && recentSearches.length > 0 && (

										<div className="p-2 border-b border-border/50 dark:border-border/50">

											<div className="px-3 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">

												<Clock className="h-3.5 w-3.5" />

												البحث الأخير

											</div>

											{recentSearches.map((search, index) => (

												<button

													key={index}

													type="button"

													onClick={() => handleRecentSearchClick(search)}

													className="w-full text-right px-4 py-2.5 hover:bg-accent dark:hover:bg-accent/80 transition-colors flex items-center gap-3 rounded-md text-sm"

												>

													<Search className="h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />

													<span className="flex-1">{search}</span>

												</button>

											))}

										</div>

									)}

									

									{/* Loading State */}

									{isSearching && (

										<motion.div

											initial={{ opacity: 0 }}

											animate={{ opacity: 1 }}

											className="flex items-center justify-center py-6"

										>

											<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary dark:border-primary" />

											<span className="mr-2 text-sm text-muted-foreground dark:text-muted-foreground">جاري البحث...</span>

										</motion.div>

									)}

									

									{/* Search Results */}

									{!isSearching && searchResults.length > 0 && (

										<div className="py-1">

											{searchResults.map((result, index) => {

												const IconComponent = result.type === "course" ? BookOpen :

													result.type === "teacher" ? Users :

													result.type === "forum" ? MessageSquare :

													FileText;

												const isSelected = selectedResultIndex === index;

												

												return (

													<button

														key={result.id}

														type="button"

														onClick={() => handleSearchResultClick(result)}

														onMouseEnter={() => setSelectedResultIndex(index)}

														className={cn(

															"w-full text-right px-4 py-3 transition-all duration-150 flex items-center gap-3 border-b border-border/50 dark:border-border/50 last:border-0",

															isSelected

																? "bg-primary/10 dark:bg-primary/20 border-r-2 border-r-primary dark:border-r-primary"

																: "hover:bg-accent/80 dark:hover:bg-accent/60"

														)}

													>

														<div className={cn(

															"p-2 rounded-lg transition-all duration-150",

															result.type === "course" && "bg-blue-100 dark:bg-blue-900/40",

															result.type === "teacher" && "bg-orange-100 dark:bg-orange-900/40",

															result.type === "forum" && "bg-green-100 dark:bg-green-900/40",

															result.type === "exam" && "bg-purple-100 dark:bg-purple-900/40",

															isSelected && "scale-110"

														)}>

															<IconComponent className={cn(

																"h-4 w-4 transition-colors",

																result.type === "course" && "text-blue-600 dark:text-blue-400",

																result.type === "teacher" && "text-orange-600 dark:text-orange-400",

																result.type === "forum" && "text-green-600 dark:text-green-400",

																result.type === "exam" && "text-purple-600 dark:text-purple-400"

															)} />

														</div>

														<div className="flex-1 text-right min-w-0">

															<p className={cn(

																"text-sm font-medium truncate transition-colors",

																isSelected && "text-primary dark:text-primary"

															)}>{result.title}</p>

															{result.description && (

																<p className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5">

																	{result.description}

																</p>

															)}

															{result.category && (

																<span className="inline-block mt-1 text-xs text-muted-foreground dark:text-muted-foreground px-2 py-0.5 rounded-md bg-muted/50 dark:bg-muted/30">

																	{result.category}

																</span>

															)}

														</div>

														<ChevronDown className={cn(

															"h-4 w-4 flex-shrink-0 rotate-90 transition-colors",

															isSelected ? "text-primary dark:text-primary" : "text-muted-foreground dark:text-muted-foreground"

														)} />

													</button>

												);

											})}

										</div>

									)}

									

									{/* No Results */}

									{!isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (

										<motion.div

											initial={{ opacity: 0 }}

											animate={{ opacity: 1 }}

											className="px-4 py-6 text-center"

										>

											<Search className="h-8 w-8 text-muted-foreground dark:text-muted-foreground mx-auto mb-2 opacity-50" />

											<p className="text-sm text-muted-foreground dark:text-muted-foreground">لا توجد نتائج</p>

											<p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">جرب مصطلحات بحث مختلفة</p>

										</motion.div>

									)}

								</motion.div>

							)}

						</AnimatePresence>

					</motion.div>

					<Button type="submit" size="icon" variant="ghost" className="hover:bg-primary/10 hover:text-primary transition-all duration-300 shadow-sm">

						<Search className="h-4 w-4" />

					</Button>

					<Button

						type="button"

						size="icon"

						variant="ghost"

						onClick={() => {

							setIsSearchOpen(false);

							setSearchQuery("");

							setSearchResults([]);

							setSearchScope("all");

						}}

						className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300"

					>

						<X className="h-4 w-4" />

					</Button>

				</motion.form>

			) : (

				<motion.div

					whileHover={{ scale: 1.05 }}

					whileTap={{ scale: 0.95 }}

				>

					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsSearchOpen(true)}
						className="flex hover:bg-primary/10 hover:text-primary transition-all duration-300 relative group h-9 w-9 md:h-10 md:w-10 rounded-full md:rounded-md"
						title="بحث (Ctrl+K / Cmd+K)"
					>
						<Search className="h-5 w-5 md:h-4 md:w-4" />
						<span className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
							<Command className="h-2.5 w-2.5" />
							<span className="hidden lg:inline">K</span>
						</span>

					</Button>

				</motion.div>

			)}

		</AnimatePresence>

	);

}




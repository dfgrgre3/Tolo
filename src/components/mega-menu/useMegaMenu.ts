import { useState, useEffect, useCallback, useMemo } from "react";

import { logger } from '@/lib/logger';

import type { User } from "@/types/user";

import type { MegaMenuCategory } from "./types";



interface UseMegaMenuProps {

    categories: MegaMenuCategory[];

    isOpen: boolean;

    onClose: () => void;

    user?: User | null;

}



export function useMegaMenu({ categories, isOpen, onClose, user }: UseMegaMenuProps) {

    const [searchQuery, setSearchQuery] = useState("");

    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const [notificationCount, setNotificationCount] = useState(0);

    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(-1);

    const [focusedItemIndex, setFocusedItemIndex] = useState(-1);

    const [recentSearches, setRecentSearches] = useState<string[]>([]);



    // Load recent searches from localStorage

    useEffect(() => {

        if (typeof window !== 'undefined') {

            const saved = localStorage.getItem('megaMenuRecentSearches');

            if (saved) {

                try {

                    setRecentSearches(JSON.parse(saved).slice(0, 5));

                } catch {

                    // Invalid JSON, ignore

                }

            }

        }

    }, []);



    // Save search to recent searches

    const saveRecentSearch = useCallback((query: string) => {

        if (!query.trim() || query.length < 2) return;



        setRecentSearches(prev => {

            const updated = [query, ...prev.filter(s => s !== query)].slice(0, 5);

            if (typeof window !== 'undefined') {

                localStorage.setItem('megaMenuRecentSearches', JSON.stringify(updated));

            }

            return updated;

        });

    }, []);



    // Fetch notification count for authenticated users

    const fetchNotificationCount = useCallback(async () => {

        if (!user) {

            setNotificationCount(0);

            return;

        }



        try {

            const res = await fetch("/api/notifications/unread-count");

            if (!res.ok) {

                throw new Error(`HTTP ${res.status}: ${res.statusText}`);

            }

            const data = await res.json();

            if (data.count !== undefined) {

                setNotificationCount(data.count);

            }

        } catch (error) {

            logger.debug("Failed to fetch notification count:", error);

            setNotificationCount(0);

        }

    }, [user]);



    useEffect(() => {

        fetchNotificationCount();

    }, [fetchNotificationCount]);



    // Filter categories and items based on search + AI Behavioral Reordering

    const filteredCategories = useMemo(() => {

        let result = categories;

        if (searchQuery.trim()) {

            const query = searchQuery.toLowerCase().trim();

            result = categories

                .map(category => ({

                    ...category,

                    items: category.items.filter(item =>

                        item.label.toLowerCase().includes(query) ||

                        item.description?.toLowerCase().includes(query) ||

                        item.href.toLowerCase().includes(query)

                    )

                }))

                .filter(category => category.items.length > 0);

            return result;

        }



        // Logic for behavioral ordering

        const hasExamSoon = true; // Simulating detection of upcoming exam



        return [...result].sort((a, b) => {

            let scoreA = 0;

            let scoreB = 0;

            // Prioritize Exam related if detected

            if (hasExamSoon) {

                if (a.title.includes("امتحانات") || a.title.includes("الفعاليات")) {

                    scoreA += 100;

                    a.isPriority = true;

                    a.priorityLabel = "موصى به للامتحان";

                }

                if (b.title.includes("امتحانات") || b.title.includes("الفعاليات")) {

                    scoreB += 100;

                    b.isPriority = true;

                    b.priorityLabel = "موصى به للامتحان";

                }

            }

            // Prioritize AI items

            if (a.title.includes("ذكية") || a.title.includes("AI")) {

                scoreA += 50;

                a.isPriority = a.isPriority || true;

                if (!a.priorityLabel) a.priorityLabel = "ذكاء اصطناعي";

            }

            if (b.title.includes("ذكية") || b.title.includes("AI")) {

                scoreB += 50;

                b.isPriority = b.isPriority || true;

                if (!b.priorityLabel) b.priorityLabel = "ذكاء اصطناعي";

            }

            return scoreB - scoreA;

        });

    }, [categories, searchQuery]);



    // Enhanced keyboard navigation support

    const handleKeyDown = useCallback((e: KeyboardEvent) => {

        if (e.key === "Escape") {

            onClose();

        } else if (e.key === "ArrowDown" && !isSearchFocused) {

            e.preventDefault();

            if (focusedCategoryIndex === -1) {

                setFocusedCategoryIndex(0);

                setFocusedItemIndex(0);

            } else {

                const currentCategory = filteredCategories[focusedCategoryIndex];

                if (currentCategory && focusedItemIndex < currentCategory.items.length - 1) {

                    setFocusedItemIndex(prev => prev + 1);

                } else if (focusedCategoryIndex < filteredCategories.length - 1) {

                    setFocusedCategoryIndex(prev => prev + 1);

                    setFocusedItemIndex(0);

                }

            }

        } else if (e.key === "ArrowUp" && !isSearchFocused) {

            e.preventDefault();

            if (focusedItemIndex > 0) {

                setFocusedItemIndex(prev => prev - 1);

            } else if (focusedCategoryIndex > 0) {

                const prevCategory = filteredCategories[focusedCategoryIndex - 1];

                setFocusedCategoryIndex(prev => prev - 1);

                setFocusedItemIndex(prevCategory ? prevCategory.items.length - 1 : 0);

            }

        } else if (e.key === "ArrowRight" && !isSearchFocused) {

            e.preventDefault();

            if (focusedCategoryIndex < filteredCategories.length - 1) {

                setFocusedCategoryIndex(prev => prev + 1);

                setFocusedItemIndex(0);

            }

        } else if (e.key === "ArrowLeft" && !isSearchFocused) {

            e.preventDefault();

            if (focusedCategoryIndex > 0) {

                setFocusedCategoryIndex(prev => prev - 1);

                setFocusedItemIndex(0);

            }

        } else if (e.key === "Enter" && focusedCategoryIndex >= 0 && focusedItemIndex >= 0 && !isSearchFocused) {

            const currentCategory = filteredCategories[focusedCategoryIndex];

            const currentItem = currentCategory?.items[focusedItemIndex];

            if (currentItem) {

                saveRecentSearch(searchQuery);

                window.location.href = currentItem.href;

            }

        }

    }, [onClose, isSearchFocused, focusedCategoryIndex, focusedItemIndex, filteredCategories, searchQuery, saveRecentSearch]);



    useEffect(() => {

        if (!isOpen) return;



        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);

    }, [isOpen, handleKeyDown]);



    // Reset focus when search changes

    useEffect(() => {

        setFocusedCategoryIndex(-1);

        setFocusedItemIndex(-1);

    }, [searchQuery]);



    return {

        searchQuery,

        setSearchQuery,

        isSearchFocused,

        setIsSearchFocused,

        notificationCount,

        focusedCategoryIndex,

        focusedItemIndex,

        recentSearches,

        filteredCategories,

    };

}


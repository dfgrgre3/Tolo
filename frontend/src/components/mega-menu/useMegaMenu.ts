import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { logger } from '@/lib/logger';
import type { User } from "@/types/user";
import type { MegaMenuCategory } from "./types";
import { useNotificationsContext } from "@/providers/notifications-provider";

interface UseMegaMenuProps {
  categories: MegaMenuCategory[];
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export function useMegaMenu({ categories, isOpen, onClose, user }: UseMegaMenuProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { unreadCount: notificationCount } = useNotificationsContext();
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(-1);
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('megaMenuRecentSearches');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, 5);
    } catch (e) {
      // Handle corrupted data gracefully
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('megaMenuRecentSearches'); } catch {}
      }
      return [];
    }
  });

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) return;
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(s => s !== query)].slice(0, 5);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('megaMenuRecentSearches', JSON.stringify(updated));
        } catch (e) {
          // Storage full or unavailable - silently ignore
        }
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('megaMenuRecentSearches');
      } catch (e) {
        // Silently ignore
      }
    }
  }, []);

  const filteredCategories = useMemo(() => {
    if (!debouncedQuery.trim()) {
      // Return original order when no search - no unnecessary sorting
      return categories;
    }
    const query = debouncedQuery.toLowerCase().trim();
    return categories
      .map(category => ({
        ...category,
        items: category.items.filter(item =>
          item.label.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.href.toLowerCase().includes(query)
        )
      }))
      .filter(category => category.items.length > 0);
  }, [categories, debouncedQuery]);

  const handleArrowDown = useCallback(() => {
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
  }, [focusedCategoryIndex, focusedItemIndex, filteredCategories]);

  const handleArrowUp = useCallback(() => {
    if (focusedItemIndex > 0) {
      setFocusedItemIndex(prev => prev - 1);
    } else if (focusedCategoryIndex > 0) {
      const prevCategory = filteredCategories[focusedCategoryIndex - 1];
      setFocusedCategoryIndex(prev => prev - 1);
      setFocusedItemIndex(prevCategory ? prevCategory.items.length - 1 : 0);
    }
  }, [focusedCategoryIndex, focusedItemIndex, filteredCategories]);

  const handleArrowRight = useCallback(() => {
    if (focusedCategoryIndex < filteredCategories.length - 1) {
      setFocusedCategoryIndex(prev => prev + 1);
      setFocusedItemIndex(0);
    }
  }, [focusedCategoryIndex, filteredCategories.length]);

  const handleArrowLeft = useCallback(() => {
    if (focusedCategoryIndex > 0) {
      setFocusedCategoryIndex(prev => prev - 1);
      setFocusedItemIndex(0);
    }
  }, [focusedCategoryIndex]);

  const handleEnter = useCallback(() => {
    if (focusedCategoryIndex >= 0 && focusedItemIndex >= 0) {
      const currentCategory = filteredCategories[focusedCategoryIndex];
      const currentItem = currentCategory?.items[focusedItemIndex];
      if (currentItem) {
        saveRecentSearch(searchQuery);
        onClose();
        router.push(currentItem.href);
      }
    }
  }, [focusedCategoryIndex, focusedItemIndex, filteredCategories, searchQuery, saveRecentSearch, onClose, router]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (isSearchFocused) {
      if (e.key === "ArrowDown" && filteredCategories.length > 0) {
        e.preventDefault();
        setIsSearchFocused(false);
        setFocusedCategoryIndex(0);
        setFocusedItemIndex(0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        handleArrowDown();
        break;
      case "ArrowUp":
        e.preventDefault();
        handleArrowUp();
        break;
      case "ArrowRight":
        e.preventDefault();
        handleArrowRight();
        break;
      case "ArrowLeft":
        e.preventDefault();
        handleArrowLeft();
        break;
      case "Enter":
        handleEnter();
        break;
    }
  }, [onClose, isSearchFocused, filteredCategories.length, handleArrowDown, handleArrowUp, handleArrowRight, handleArrowLeft, handleEnter]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setFocusedCategoryIndex(-1);
      setFocusedItemIndex(-1);
      setDebouncedQuery(query);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery: updateSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    notificationCount,
    focusedCategoryIndex,
    focusedItemIndex,
    recentSearches,
    clearRecentSearches,
    filteredCategories,
  };
}

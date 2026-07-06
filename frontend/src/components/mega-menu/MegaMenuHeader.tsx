"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Search, Command, X, Zap, Bell, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";

interface MegaMenuHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  onClose: () => void;
  user?: User | null;
  notificationCount: number;
  recentSearches: string[];
  onClearRecent: () => void;
  totalItems: number;
  hasSearchResults: boolean;
}

export const MegaMenuHeader = React.memo(function MegaMenuHeader({
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  setIsSearchFocused,
  onClose,
  user,
  notificationCount,
  recentSearches,
  onClearRecent,
  totalItems,
  hasSearchResults
}: MegaMenuHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchFocusedRef = useRef(isSearchFocused);
  isSearchFocusedRef.current = isSearchFocused;

  useEffect(() => {
    const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSlashKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "/" && !isSearchFocusedRef.current) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleSlashKey);
    return () => document.removeEventListener("keydown", handleSlashKey);
  }, [handleSlashKey]);

  return (
    <div className="relative border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center gap-3 px-4 md:px-6 py-3">
        <div className="flex-1 relative group/search">
          <m.div
            animate={isSearchFocused ? { scale: [1, 1.15, 1], rotate: [0, 5] } : {}}
            transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
          >
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary transition-all duration-300 z-10" />
          </m.div>

          <Input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث في القائمة... (اضغط / للبحث)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              "w-full ps-10 pe-10 py-2.5",
              "bg-background/80 backdrop-blur-md border-border/50",
              "focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:ring-offset-0",
              "transition-all duration-300 shadow-inner",
              isSearchFocused && "border-primary/60 bg-background shadow-lg shadow-primary/5"
            )}
            aria-label="البحث في القائمة"
          />

          {!searchQuery && !isSearchFocused && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/50"
            >
              <Command className="h-3 w-3 text-muted-foreground" />
              <kbd className="text-[10px] font-mono text-muted-foreground">/</kbd>
            </m.div>
          )}

          {searchQuery && (
            <m.button
              initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 hover:from-destructive/30 hover:to-destructive/20 text-destructive transition-all duration-200 flex items-center justify-center border border-destructive/35"
              aria-label="مسح البحث"
            >
              <X className="h-3 w-3" />
            </m.button>
          )}
        </div>

        {hasSearchResults && (
          <m.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 text-primary text-xs font-bold border border-primary/30 shadow-sm backdrop-blur-sm"
          >
            <m.div animate={{ rotate: [0, 360] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}>
              <Zap className="h-3.5 w-3.5" />
            </m.div>
            <span>{totalItems} نتيجة</span>
          </m.div>
        )}

        {user && (
          <Link
            href="/notifications"
            onClick={onClose}
            className="relative h-10 w-10 rounded-xl hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:text-primary transition-all duration-300 hover:scale-105 active:scale-95 border border-transparent hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 flex items-center justify-center"
            aria-label="الإشعارات"
          >
            <m.div whileHover={{ rotate: 12, scale: 1.15 }} transition={{ duration: 0.3 }}>
              <Bell className="h-4 w-4" />
            </m.div>
            {notificationCount > 0 && (
              <m.span
                initial={false}
                animate={{ scale: 1 }}
                style={{ transform: 'none' }}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-destructive via-destructive to-destructive/80 text-destructive-foreground text-[10px] font-bold shadow-lg ring-2 ring-background"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </m.span>
            )}
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-xl hover:bg-gradient-to-br hover:from-destructive/20 hover:to-destructive/10 hover:text-destructive transition-all duration-300 hover:scale-105 active:scale-95 border border-transparent hover:border-destructive/20 hover:shadow-lg hover:shadow-destructive/5"
          aria-label="إغلاق القائمة"
        >
          <m.div whileHover={{ rotate: 90 }} transition={{ duration: 0.3 }}>
            <X className="h-4 w-4" />
          </m.div>
        </Button>
      </div>

      <AnimatePresence>
        {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 md:px-6 pb-2 overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground">البحث الأخير:</span>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onClearRecent();
                  }}
                  className="text-[10px] text-destructive/80 hover:text-destructive hover:underline transition-colors font-semibold"
                >
                  مسح الكل
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {recentSearches.map((search, index) => (
                  <m.button
                    key={`${search}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery(search);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                  >
                    <Hash className="h-3 w-3" />
                    {search}
                  </m.button>
                ))}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

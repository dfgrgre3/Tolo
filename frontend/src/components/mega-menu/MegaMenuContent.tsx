"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { AnimatePresence, MotionConfig, m } from "framer-motion";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { logger } from '@/lib/logger';
import { cn } from "@/lib/utils";
import type { MegaMenuProps } from "./types";
import { useMegaMenu } from "./useMegaMenu";
import { MegaMenuHeader } from "./MegaMenuHeader";
import { MegaMenuFooter } from "./MegaMenuFooter";
import { MegaMenuContainer } from "./MegaMenuContainer";
import { MegaMenuEmptyState } from "./MegaMenuEmptyState";
import { MegaMenuGrid } from "./MegaMenuGrid";
import { FeaturedPromo } from "./FeaturedPromo";

const AiSuggestionsLoader = () => (
	<m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-8 gap-3">
		<m.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
			<Loader2 className="h-5 w-5 text-primary" />
		</m.div>
		<span className="text-sm text-muted-foreground">جاري تحميل التوصيات الذكية...</span>
	</m.div>
);

const AiSuggestions = dynamic(
	() => import("./AiSuggestions").catch((err) => {
		logger.error("ChunkLoadError in AiSuggestions:", err);
		return { default: () => null };
	}),
	{ ssr: false, loading: () => <AiSuggestionsLoader /> }
);

export const MegaMenuContent = React.memo(function MegaMenuContent({ categories, isOpen, onClose, activeRoute, user }: MegaMenuProps) {
	const {
		searchQuery,
		setSearchQuery,
		isSearchFocused,
		setIsSearchFocused,
		notificationCount,
		focusedCategoryIndex,
		focusedItemIndex,
		recentSearches,
		clearRecentSearches,
		filteredCategories,
	} = useMegaMenu({ categories, isOpen, onClose, user });

	const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);

	const gridCols = useMemo(() => {
		const count = filteredCategories.length;
		if (count === 1) return "grid-cols-1";
		if (count === 2) return "grid-cols-1 sm:grid-cols-2";
		if (count === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
		if (count === 4) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
		if (count === 5) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
		return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
	}, [filteredCategories.length]);

	const menuWidth = "w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-12";

	const { totalItems, isCompact, isExtraCompact } = useMemo(() => {
		const total = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
		return {
			totalItems: total,
			isCompact: total > 15,
			isExtraCompact: total > 30,
		};
	}, [filteredCategories]);

	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	const menuHeight = useMemo(() => {
		if (isMobile) {
			return isExtraCompact ? 'max-h-[50vh]' : isCompact ? 'max-h-[60vh]' : 'max-h-[70vh]';
		}
		return isExtraCompact ? 'max-h-[60vh]' : isCompact ? 'max-h-[70vh]' : 'max-h-[80vh]';
	}, [isCompact, isExtraCompact, isMobile]);

	const hasSearchResults = searchQuery.trim() && filteredCategories.length > 0;
	const hasNoResults = searchQuery.trim() && filteredCategories.length === 0;

	if (!isOpen) return null;

  return (
    <MotionConfig reducedMotion="user">
      <>
        <MegaMenuContainer menuWidth={menuWidth}>
          <MegaMenuHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearchFocused={isSearchFocused}
            setIsSearchFocused={setIsSearchFocused}
            onClose={onClose}
            user={user}
            notificationCount={notificationCount}
            recentSearches={recentSearches}
            onClearRecent={clearRecentSearches}
            totalItems={totalItems}
            hasSearchResults={!!hasSearchResults}
          />

          <div className={cn(
            "relative overflow-y-auto",
            "scrollbar-thin scrollbar-thumb-primary/30 scrollbar-thumb-rounded-full",
            "scrollbar-track-transparent hover:scrollbar-thumb-primary/40",
            "-webkit-overflow-scrolling: touch",
            menuHeight
          )}>
						<AnimatePresence mode="wait">
							{hasNoResults ? (
								<MegaMenuEmptyState searchQuery={searchQuery} onClose={onClose} />
							) : (
            <div className={cn("flex flex-col", !searchQuery && "lg:flex-row gap-4 p-1 sm:p-1.5 md:p-2")}>
              <div className="flex-1 relative">
                <MegaMenuGrid
                  categories={filteredCategories}
                  gridCols={gridCols}
                  isCompact={isCompact}
                  searchQuery={searchQuery}
                  focusedCategoryIndex={focusedCategoryIndex}
                  focusedItemIndex={focusedItemIndex}
                  onClose={onClose}
                  activeRoute={activeRoute}
                  setCategoryRef={(index, el) => { categoryRefs.current[index] = el; }}
                />
              </div>
              {!searchQuery && (
                <div className="w-full lg:w-80 shrink-0 px-3 md:px-4 pb-4 lg:pb-0 lg:pt-4 lg:pe-4 flex flex-col gap-4">
                  <FeaturedPromo user={user} onClose={onClose} />
                  {user && (
                    <AiSuggestions
                      userId={user.id || (user as any).userId || ""}
                      isCompact={true}
                      onItemClick={onClose}
                    />
                  )}
                </div>
              )}
            </div>
							)}
						</AnimatePresence>
					</div>

					{!searchQuery && (
						<MegaMenuFooter categoriesCount={categories.length} totalItems={totalItems} />
					)}
				</MegaMenuContainer>
			</>
		</MotionConfig>
	);
});
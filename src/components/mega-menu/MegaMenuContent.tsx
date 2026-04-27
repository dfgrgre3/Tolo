"use client";



import React, { useRef } from "react";

import { AnimatePresence, MotionConfig, m } from "framer-motion";

import { Loader2 } from "lucide-react";

import type { MegaMenuProps } from "./types";

import { MegaMenuHeader } from "./MegaMenuHeader";

import { MegaMenuFooter } from "./MegaMenuFooter";

import { cn } from "@/lib/utils";

import { useMegaMenu } from "./useMegaMenu";

import { MegaMenuBackdrop } from "./MegaMenuBackdrop";

import { MegaMenuContainer } from "./MegaMenuContainer";

import { MegaMenuEmptyState } from "./MegaMenuEmptyState";

import { MegaMenuGrid } from "./MegaMenuGrid";
import dynamic from "next/dynamic";
import { logger } from '@/lib/logger';

// Dynamic load AI Suggestions with error handling and retry logic
const AiSuggestions = dynamic(
	() => import("./AiSuggestions").catch((err) => {
		logger.error("ChunkLoadError in AiSuggestions:", err);
		return { default: () => null };
	}), 
	{
		ssr: false,
		loading: () => <AiSuggestionsLoader />
	}
);

const AiSuggestionsLoader = () => (

	<m.div

		initial={{ opacity: 0 }}

		animate={{ opacity: 1 }}

		className="flex items-center justify-center py-8 gap-3"

	>

		<m.div

			animate={{ rotate: 360 }}

			transition={{ duration: 1, repeat: Infinity, ease: "linear" }}

		>

			<Loader2 className="h-5 w-5 text-primary" />

		</m.div>

		<span className="text-sm text-muted-foreground">جاري تحميل التوصيات الذكية...</span>

	</m.div>

);



export function MegaMenuContent({ 

	categories, 

	isOpen, 

	onClose, 

	activeRoute,

	user

}: MegaMenuProps) {

	const {

		searchQuery,

		setSearchQuery,

		isSearchFocused,

		setIsSearchFocused,

		notificationCount,

		focusedCategoryIndex,

		focusedItemIndex,

		recentSearches,

		filteredCategories,

	} = useMegaMenu({ categories, isOpen, onClose, user });



	const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);



	if (!isOpen) return null;



	// Calculate optimal grid columns based on number of categories and device type

	const gridCols = (() => {

		const count = filteredCategories.length;

		// Mobile-first approach

		if (count === 1) return "grid-cols-1";

		if (count === 2) return "grid-cols-1 sm:grid-cols-2";

		if (count === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

		if (count === 4) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

		if (count === 5) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";

		return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

	})();



	// Calculate dynamic width based on content and device

	const menuWidth = (() => {

		const count = filteredCategories.length;

		// Mobile-first responsive width

		if (count === 1) return "w-full max-w-2xl";

		if (count === 2) return "w-full max-w-3xl";

		if (count === 3) return "w-full max-w-4xl";

		if (count === 4) return "w-full max-w-5xl";

		if (count === 5) return "w-full max-w-6xl";

		return "w-full max-w-7xl";

	})();



	// Calculate total items count for dynamic sizing

	const totalItems = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);



	// Determine if we need compact mode (many items)

	const isCompact = totalItems > 15;



	// Determine if we need extra compact mode (many more items)

	const isExtraCompact = totalItems > 30;



	// Calculate dynamic height based on content and device

	const menuHeight = (() => {

		if (typeof window !== 'undefined' && window.innerWidth < 768) {

			// Mobile: use more of the screen height

			return isExtraCompact ? 'max-h-[50vh]' : isCompact ? 'max-h-[60vh]' : 'max-h-[70vh]';

		} else {

			// Desktop: standard heights

			return isExtraCompact ? 'max-h-[60vh]' : isCompact ? 'max-h-[70vh]' : 'max-h-[80vh]';

		}

	})();



	const hasSearchResults = searchQuery.trim() && filteredCategories.length > 0;

	const hasNoResults = searchQuery.trim() && filteredCategories.length === 0;



	return (

		<MotionConfig reducedMotion="user">

			<>

				<MegaMenuBackdrop onClose={onClose} />

				

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

						totalItems={totalItems}

						hasSearchResults={!!hasSearchResults}

					/>



					{/* Content section - dynamic sizing with enhanced scrollbar */}

					<div className={cn(

						"relative overflow-y-auto",

						"scrollbar-thin scrollbar-thumb-primary/30 scrollbar-thumb-rounded-full",

						"scrollbar-track-transparent hover:scrollbar-thumb-primary/40",

						"-webkit-overflow-scrolling: touch", // Enable momentum scrolling on iOS

						menuHeight

					)}>

						<AnimatePresence mode="wait">

							{hasNoResults ? (

								<MegaMenuEmptyState searchQuery={searchQuery} onClose={onClose} />

							) : (

								<div className="flex flex-col">

									{/* AI Suggestions - only show when not searching (with Lazy Loading) */}

									{!searchQuery && user && (

										<div className={cn(
											"px-4 md:px-6",
											isCompact ? 'pt-4 md:pt-5' : 'pt-6 md:pt-8'
										)}>
											<AiSuggestions
													userId={user.id || (user as any).userId || ""}
													isCompact={isCompact}
													onItemClick={onClose}
												/>
										</div>

									)}



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

							)}

						</AnimatePresence>

					</div>



					{/* Footer with quick stats - enhanced design */}

					{!searchQuery && (

						<MegaMenuFooter

							categoriesCount={categories.length}

							totalItems={totalItems}

						/>

					)}

				</MegaMenuContainer>

			</>

		</MotionConfig>

	);

}


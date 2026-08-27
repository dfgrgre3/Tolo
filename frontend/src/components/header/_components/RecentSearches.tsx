"use client";

import { Clock, Search, X } from "lucide-react";

interface RecentSearchesProps {
	searches: string[];
	onSearchClick: (search: string) => void;
	onClearSearch?: (search: string) => void;
	onClearAll?: () => void;
	variant?: "mobile" | "desktop";
}

export const RecentSearches = ({
	searches,
	onSearchClick,
	onClearSearch,
	onClearAll,
	variant = "mobile"
}: RecentSearchesProps) => {
	if (!searches || searches.length === 0) {
		return null;
	}

	const isDesktop = variant === "desktop";

	if (isDesktop) {
		return (
			<div className="p-2 border-b border-border/50 dark:border-border/50">
				<div className="px-3 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Clock className="h-3.5 w-3.5" aria-hidden="true" />
						<span>البحث الأخير</span>
					</div>

					{onClearAll && (
						<button
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								onClearAll();
							}}
							className="text-[10px] font-medium hover:text-destructive cursor-pointer rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
						>
							مسح الكل
						</button>
					)}
				</div>

				<div className="space-y-0.5 mt-1">
					{searches.map((search, index) => (
						<div
							key={`${index}-${search}`}
							className="group/item flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent dark:hover:bg-accent/80 focus-within:bg-accent dark:focus-within:bg-accent/80"
						>
							<button
								type="button"
								onClick={() => onSearchClick(search)}
								className="flex-1 min-w-0 text-start flex items-center gap-3 text-sm text-foreground/80 hover:text-foreground cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
							>
								<Search
									className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60 group-hover/item:text-primary"
									aria-hidden="true"
								/>
								<span className="flex-1 truncate" title={search}>
									{search}
								</span>
							</button>

							{onClearSearch && (
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										onClearSearch(search);
									}}
									className="opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 p-1 hover:bg-muted dark:hover:bg-muted/80 rounded-md text-muted-foreground hover:text-destructive cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex-shrink-0"
									title="حذف من السجل"
									aria-label={`حذف "${search}" من السجل`}
								>
									<X className="h-3.5 w-3.5" aria-hidden="true" />
								</button>
							)}
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="px-2 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Clock className="h-3.5 w-3.5" aria-hidden="true" />
					<span>البحث الأخير</span>
				</div>

				{onClearAll && (
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							onClearAll();
						}}
						className="text-xs font-medium hover:text-destructive cursor-pointer rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
					>
						مسح الكل
					</button>
				)}
			</div>

			<div className="space-y-1.5">
				{searches.map((search, index) => (
					<div
						key={`${index}-${search}`}
						className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 dark:border-border/50 hover:bg-accent dark:hover:bg-accent/80 focus-within:bg-accent dark:focus-within:bg-accent/80"
					>
						<button
							type="button"
							onClick={() => onSearchClick(search)}
							className="flex-1 min-w-0 text-start flex items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
						>
							<Search
								className="h-4 w-4 flex-shrink-0 text-muted-foreground/60"
								aria-hidden="true"
							/>
							<span className="flex-1 truncate" title={search}>
								{search}
							</span>
						</button>

						{onClearSearch && (
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									onClearSearch(search);
								}}
								className="p-1 hover:bg-muted dark:hover:bg-muted/80 rounded-md text-muted-foreground hover:text-destructive cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex-shrink-0"
								title="حذف من السجل"
								aria-label={`حذف "${search}" من السجل`}
							>
								<X className="h-4 w-4" aria-hidden="true" />
							</button>
						)}
					</div>
				))}
			</div>
		</div>
	);
};
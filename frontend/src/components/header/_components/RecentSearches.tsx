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
	const isDesktop = variant === "desktop";

	if (isDesktop) {
		return (
			<div className="p-2 border-b border-border/50 dark:border-border/50">
				<div className="px-3 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Clock className="h-3.5 w-3.5" />
						<span>البحث الأخير</span>
					</div>
					{onClearAll && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onClearAll();
							}}
							className="text-[10px] font-medium hover:text-destructive transition-colors cursor-pointer"
						>
							مسح الكل
						</button>
					)}
				</div>
				<div className="space-y-0.5 mt-1">
					{searches.map((search, index) => (
						<div
							key={index}
							className="group/item flex items-center gap-2 px-3 py-1.5 hover:bg-accent dark:hover:bg-accent/80 rounded-lg transition-colors"
						>
							<button
								type="button"
								onClick={() => onSearchClick(search)}
								className="flex-1 text-right flex items-center gap-3 text-sm text-foreground/80 hover:text-foreground transition-colors"
							>
								<Search className="h-3.5 w-3.5 text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
								<span className="flex-1 truncate">{search}</span>
							</button>
							{onClearSearch && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onClearSearch(search);
									}}
									className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-muted dark:hover:bg-muted/80 rounded-md text-muted-foreground hover:text-destructive transition-all duration-200 cursor-pointer"
									title="حذف من السجل"
								>
									<X className="h-3.5 w-3.5" />
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
			<div className="px-2 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Clock className="h-3.5 w-3.5" />
					<span>البحث الأخير</span>
				</div>
				{onClearAll && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onClearAll();
						}}
						className="text-xs font-medium hover:text-destructive transition-colors px-1"
					>
						مسح الكل
					</button>
				)}
			</div>
			<div className="space-y-1.5">
				{searches.map((search, index) => (
					<div
						key={index}
						className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 dark:border-border/50 hover:bg-accent dark:hover:bg-accent/80 transition-colors"
					>
						<button
							type="button"
							onClick={() => onSearchClick(search)}
							className="flex-1 text-right flex items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
						>
							<Search className="h-4 w-4 text-muted-foreground/60" />
							<span className="flex-1 truncate">{search}</span>
						</button>
						{onClearSearch && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onClearSearch(search);
								}}
								className="p-1 hover:bg-muted dark:hover:bg-muted/80 rounded-md text-muted-foreground hover:text-destructive transition-all duration-200"
								title="حذف من السجل"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

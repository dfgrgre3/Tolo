"use client";

import React from "react";
import { Sparkles, TrendingUp, ChevronUp, ChevronDown } from "lucide-react";

interface MegaMenuFooterProps {
	categoriesCount: number;
	totalItems: number;
}

export function MegaMenuFooter({ categoriesCount, totalItems }: MegaMenuFooterProps) {
	return (
		<div className="relative border-t border-border/50 bg-gradient-to-r from-primary/8 via-primary/4 to-primary/8 px-4 md:px-6 py-3">
			{/* Footer glow */}
			<div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50" />

			<div className="relative flex items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-5">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
						<Sparkles className="h-3.5 w-3.5 text-primary" />
						<span className="font-semibold text-primary">{categoriesCount} فئة</span>
					</div>
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
						<TrendingUp className="h-3.5 w-3.5 text-primary" />
						<span className="font-semibold text-primary">{totalItems} عنصر</span>
					</div>
				</div>

				{/* Keyboard shortcuts hint */}
				<div className="flex items-center gap-2">
					<div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 border border-border/50 backdrop-blur-sm">
						<ChevronUp className="h-3 w-3 text-muted-foreground" />
						<ChevronDown className="h-3 w-3 text-muted-foreground" />
						<span className="font-medium">للتنقل</span>
					</div>
					<div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background/60 border border-border/50 backdrop-blur-sm">
						<kbd className="px-2 py-1 rounded-md bg-background/80 border border-border/60 text-[10px] font-mono font-semibold shadow-sm">
							ESC
						</kbd>
						<span className="font-medium">للإغلاق</span>
					</div>
				</div>
			</div>
		</div>
	);
}

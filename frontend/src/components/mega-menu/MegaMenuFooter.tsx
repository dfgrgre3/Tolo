"use client";

import React from "react";
import { m } from "framer-motion";
import { Sparkles, TrendingUp, ChevronLeft } from "lucide-react";

interface MegaMenuFooterProps {
	categoriesCount: number;
	totalItems: number;
}

export function MegaMenuFooter({ categoriesCount, totalItems }: MegaMenuFooterProps) {
	return (
		<m.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
			className="relative border-t border-border/50 bg-gradient-to-r from-primary/8 via-primary/4 to-primary/8 backdrop-blur-md px-4 md:px-6 py-3"
		>
			{/* Footer glow */}
			<div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50" />
			
			<div className="relative flex items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-5">
					<m.div
						whileHover={{ scale: 1.05 }}
						className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20"
					>
						<m.div
							animate={{ rotate: [0, 360] }}
							transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
						>
							<Sparkles className="h-3.5 w-3.5 text-primary" />
						</m.div>
						<span className="font-semibold text-primary">{categoriesCount} فئة</span>
					</m.div>
					<m.div
						whileHover={{ scale: 1.05 }}
						className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20"
					>
						<TrendingUp className="h-3.5 w-3.5 text-primary" />
						<span className="font-semibold text-primary">{totalItems} عنصر</span>
					</m.div>
				</div>

				{/* Keyboard shortcuts hint */}
				<div className="flex items-center gap-2">
					<m.div
						whileHover={{ scale: 1.05 }}
						className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 border border-border/50 backdrop-blur-sm"
					>
						<ChevronLeft className="h-3 w-3 text-muted-foreground rotate-90" />
						<ChevronLeft className="h-3 w-3 text-muted-foreground -rotate-90" />
						<span className="font-medium">للتنقل</span>
					</m.div>
					<m.div
						whileHover={{ scale: 1.05 }}
						className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background/60 border border-border/50 backdrop-blur-sm"
					>
						<kbd className="px-2 py-1 rounded-md bg-background/80 border border-border/60 text-[10px] font-mono font-semibold shadow-sm">
							ESC
						</kbd>
						<span className="font-medium">للإغلاق</span>
					</m.div>
				</div>
			</div>
		</m.div>
	);
}

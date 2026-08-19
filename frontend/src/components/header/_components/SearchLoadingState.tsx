"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SearchLoadingStateProps {
	animated?: boolean;
	className?: string;
}

export const SearchLoadingState = ({ animated = true, className }: SearchLoadingStateProps) => {
	return (
		<div className={cn("w-full", className)} role="status" aria-live="polite">
			<div className="flex items-center justify-center py-6 gap-3">
				<Loader2
					className={cn(
						"h-5 w-5 text-primary dark:text-primary",
						animated && "animate-spin"
					)}
					aria-hidden="true"
				/>
				<span className="text-sm text-muted-foreground dark:text-muted-foreground">
					جاري البحث...
				</span>
			</div>
		</div>
	);
};
"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchNoResultsProps {
	className?: string;
}

export const SearchNoResults = ({ className }: SearchNoResultsProps) => {
	return (
		<div
			className={cn("px-4 py-6 text-center", className)}
			role="status"
			aria-live="polite"
		>
			<Search
				className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50"
				aria-hidden="true"
			/>
			<p className="text-sm font-medium text-muted-foreground">
				لا توجد نتائج
			</p>
			<p className="text-xs text-muted-foreground mt-1">
				جرب مصطلحات بحث مختلفة
			</p>
		</div>
	);
};
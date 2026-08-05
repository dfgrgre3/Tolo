"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchNoResultsProps {
	className?: string;
}

export const SearchNoResults = ({ className }: SearchNoResultsProps) => {
	return (
		<div className={cn("px-4 py-6 text-center", className)}>
			<Search className="h-8 w-8 text-muted-foreground dark:text-muted-foreground mx-auto mb-2 opacity-50" />
			<p className="text-sm text-muted-foreground dark:text-muted-foreground">لا توجد نتائج</p>
			<p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">جرب مصطلحات بحث مختلفة</p>
		</div>
	);
};
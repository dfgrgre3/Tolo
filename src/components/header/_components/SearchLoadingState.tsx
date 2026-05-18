"use client";

import { m } from "framer-motion";

interface SearchLoadingStateProps {
	animated?: boolean;
	className?: string;
}

export const SearchLoadingState = ({ animated = true, className }: SearchLoadingStateProps) => {
	const content = (
		<div className="flex items-center justify-center py-6">
			<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary dark:border-primary" />
			<span className="mr-2 text-sm text-muted-foreground dark:text-muted-foreground">جاري البحث...</span>
		</div>
	);

	if (animated) {
		return (
			<m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={className}>
				{content}
			</m.div>
		);
	}

	return <div className={className}>{content}</div>;
};

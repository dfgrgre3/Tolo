"use client";

interface SearchLoadingStateProps {
	animated?: boolean;
	className?: string;
}

export const SearchLoadingState = ({ className }: SearchLoadingStateProps) => {
	return (
		<div className={className}>
			<div className="flex items-center justify-center py-6">
				<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary dark:border-primary" />
				<span className="mr-2 text-sm text-muted-foreground dark:text-muted-foreground">جاري البحث...</span>
			</div>
		</div>
	);
};
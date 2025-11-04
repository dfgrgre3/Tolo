"use client";

import { Loader2 } from 'lucide-react';

export function LoadingState() {
	return (
		<div className="flex flex-col items-center justify-center py-16">
			<Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
			<p className="text-muted-foreground">جاري تحميل الإنجازات...</p>
		</div>
	);
}


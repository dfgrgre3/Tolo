import { Suspense } from "react";
import { getProgressSummary } from "@/lib/server-data-fetch";
import { HomeClient } from "@/app/components/home/HomeClient";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Server Component - Home Page
 * 
 * This page now uses Server Components to fetch data on the server,
 * which improves performance and reduces client-side JavaScript:
 * 
 * Benefits:
 * - Data is fetched on the server, reducing client-side loading
 * - Better SEO and initial page load performance
 * - Reduced hydration errors
 * - Improved Core Web Vitals (LCP, FCP)
 * 
 * The client-side interactive components are separated into HomeClient
 */
import { LoadingSpinner } from "@/components/ui/loading-state";

export default async function Home() {
	// Fetch data on the server
	// This runs on the server, not in the browser
	const summary = await getProgressSummary();

	return (
		<Suspense fallback={
			<div className="min-h-screen bg-background flex items-center justify-center">
				<LoadingSpinner />
			</div>
		}>
			<HomeClient summary={summary} />
		</Suspense>
	);
}

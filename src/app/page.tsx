"use client";

import Link from "next/link";
import React, { useEffect, useState, useRef, Suspense, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import dynamic from "next/dynamic";
import { Button } from "@/shared/button";
import { useAuth } from "@/components/auth/UserProvider";
import { Badge } from "@/shared/badge";
import { Progress } from "@/shared/progress";
import { Card, CardContent } from "@/shared/card";
import { Clock, Target, CheckCircle2, Flame, ChevronDown, TrendingUp, Zap, BookOpen, Users, Brain, Calendar, Award, Star, ArrowRight, Sparkles, BarChart3, MessageSquare, FileText, Trophy, Lightbulb, Rocket } from "lucide-react";
import { LazyLoadSection } from "@/components/ui/LazyLoadSection";
import { ProgressiveComponent, createProgressiveSection } from "@/components/ui/ProgressiveComponent";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { motion, AnimatePresence } from "framer-motion";
import { useClientEffect } from "@/hooks/use-client-effect";
import { useHydrationFix } from "@/hydration-fix";
import { safeGetItem, safeSetItem, safeFetch } from "@/lib/safe-client-utils";
import errorManager from "@/services/ErrorManager";

// Advanced scroll-triggered animation variants
const scrollVariants = {
  fadeUp: {
    initial: { opacity: 0, y: 50 },
    whileInView: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  fadeLeft: {
    initial: { opacity: 0, x: -50 },
    whileInView: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  fadeRight: {
    initial: { opacity: 0, x: 50 },
    whileInView: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  scaleUp: {
    initial: { opacity: 0, scale: 0.8 },
    whileInView: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  staggerChildren: {
    initial: { opacity: 0 },
    whileInView: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    },
    viewport: { once: true, margin: "-100px" }
  },
  staggerItem: {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    viewport: { once: true, margin: "-50px" }
  }
};

// Optimize dynamic imports for better performance
const HeroSection = dynamic(() => import("./home-sections/HeroSectionEnhanced"), { 
  ssr: true, // Enable SSR for better performance
  loading: () => <SkeletonLoader className="h-64 rounded-lg" />
});

const QuickLinksSection = dynamic(() => import("./home-sections/QuickLinksSectionEnhanced"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const TipsSection = dynamic(() => import("./home-sections/TipsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const AchievementsSection = dynamic(() => import("./home-sections/AchievementsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const ExamsSection = dynamic(() => import("./home-sections/ExamsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const AnalyticsSection = dynamic(() => import("./home-sections/AnalyticsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const FeaturesSection = dynamic(() => import("./home-sections/FeaturesSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const BlogSection = dynamic(() => import("./home-sections/BlogSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const ContactSection = dynamic(() => import("./home-sections/ContactSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

// Advanced sections
const IntelligentRecommendationsSection = dynamic(() => import("./home-sections/IntelligentRecommendationsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const LiveActivityFeedSection = dynamic(() => import("./home-sections/LiveActivityFeedSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const AdvancedSearchSection = dynamic(() => import("./home-sections/AdvancedSearchSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const PerformanceDashboardSection = dynamic(() => import("./home-sections/PerformanceDashboardSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const SocialFeaturesSection = dynamic(() => import("./home-sections/SocialFeaturesSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const ProgressPredictionsSection = dynamic(() => import("./home-sections/ProgressPredictionsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const StatusIndicatorsSection = dynamic(() => import("./home-sections/StatusIndicatorsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

import Dashboard from "@/components/Dashboard";

const Home = () => {
	const [summary, setSummary] = useState<{ totalMinutes: number; averageFocus: number; tasksCompleted: number; streakDays: number } | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { user } = useAuth();
	const isHydrated = useHydrationFix();
	const dashboardRef = useRef<HTMLDivElement>(null);
	const LOCAL_USER_KEY = "tw_user_id";
	const fetchInProgressRef = useRef(false);

	// Memoize user data to prevent unnecessary re-renders
	const memoizedUser = useMemo(() => {
		return user ? { ...user } : null;
	}, [user]);

	const ensureUser = async (): Promise<string> => {
		// Only run on client side to avoid hydration issues
		if (typeof window === 'undefined') return '';

		let id = safeGetItem(LOCAL_USER_KEY, { fallback: null });
		if (!id) {
			try {
				const { data, error: userError } = await safeFetch<{ id: string }>(
					"/api/users/guest",
					{
						method: "POST",
						next: { revalidate: 3600 } // Revalidate every hour
					},
					{ id: '' }
				);
				if (userError) {
					errorManager.handleNetworkError(userError, "/api/users/guest", {
						showToast: false
					});
				} else if (data?.id) {
					id = data.id;
					safeSetItem(LOCAL_USER_KEY, id);
				}
			} catch (error) {
				console.warn("Failed to create guest user:", error);
				errorManager.handleNetworkError(
					error instanceof Error ? error : new Error(String(error)),
					"/api/users/guest",
					{ showToast: false }
				);
			}
		}
		return id || '';
	};

	// Optimize data fetching with better caching and prevent infinite loops
	const fetchSummary = async () => {
		// Prevent concurrent executions and early returns
		if (fetchInProgressRef.current) {
			console.log("Fetch already in progress, skipping");
			return;
		}

		fetchInProgressRef.current = true;

		// Use a single state update to prevent multiple re-renders
		const updateState = (newSummary: typeof summary, newIsLoading: boolean, newError: string | null) => {
			setSummary(newSummary);
			setIsLoading(newIsLoading);
			if (newError) {
				setError(newError);
			}
		};

		try {
			setIsLoading(true);
			const userId = await ensureUser();

			// Check if userId exists before making the API call
			if (!userId) {
				console.warn("No user ID available, skipping summary fetch");
				updateState({
					totalMinutes: 0,
					averageFocus: 0,
					tasksCompleted: 0,
					streakDays: 0
				}, false, null);
				return;
			}

			let res;
			try {
				res = await fetch(`/api/progress/summary?userId=${userId}`, {
					// Improve caching strategy
					next: {
						revalidate: 300 // Revalidate every 5 minutes
					},
					headers: {
						'Cache-Control': 'max-age=300, stale-while-revalidate=60',
					}
				});
			} catch (fetchError) {
				console.warn("Failed to fetch progress summary:", fetchError);
				updateState({
					totalMinutes: 0,
					averageFocus: 0,
					tasksCompleted: 0,
					streakDays: 0
				}, false, null);
				return;
			}

			if (res && res.ok) {
				try {
					const data = await res.json();
					// Validate the data structure
					if (data && typeof data === 'object') {
						updateState({
							totalMinutes: Number(data.totalMinutes) || 0,
							averageFocus: Number(data.averageFocus) || 0,
							tasksCompleted: Number(data.tasksCompleted) || 0,
							streakDays: Number(data.streakDays) || 0
						}, false, null);
					} else {
						console.warn("Invalid data structure received from API");
						updateState({
							totalMinutes: 0,
							averageFocus: 0,
							tasksCompleted: 0,
							streakDays: 0
						}, false, null);
					}
				} catch (jsonError) {
					console.warn("Error parsing API response:", jsonError);
					updateState({
						totalMinutes: 0,
						averageFocus: 0,
						tasksCompleted: 0,
						streakDays: 0
					}, false, "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ظ„ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ");
				}
			} else if (res) {
				console.warn(`API returned status ${res.status}, using default values`);
				updateState({
					totalMinutes: 0,
					averageFocus: 0,
					tasksCompleted: 0,
					streakDays: 0
				}, false, null);
			} else {
				updateState({
					totalMinutes: 0,
					averageFocus: 0,
					tasksCompleted: 0,
					streakDays: 0
				}, false, null);
			}
		} catch (err) {
			console.error("Error in fetchSummary:", err);
			updateState({
				totalMinutes: 0,
				averageFocus: 0,
				tasksCompleted: 0,
				streakDays: 0
			}, false, "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ظ…ظٹظ„ ط§ظ„ط¥ط­طµط§ط¦ظٹط§طھ");
		} finally {
			fetchInProgressRef.current = false;
		}
	};

	// Optimize useEffect with better performance strategy using enhanced client-side hook
	useClientEffect(() => {
		// This hook already handles client-side only execution
		// Use requestIdleCallback for better performance if available
		if ('requestIdleCallback' in window) {
			const idleCallbackId = window.requestIdleCallback(() => {
				fetchSummary();
			}, { timeout: 2000 });

			// Clean up the idle callback
			return () => {
				if (idleCallbackId && 'cancelIdleCallback' in window) {
					window.cancelIdleCallback(idleCallbackId);
				}
			};
		} else {
			// Fallback for browsers that don't support requestIdleCallback
			const timeoutId = setTimeout(fetchSummary, 100);
			return () => clearTimeout(timeoutId);
		}
	}, []); // Empty dependency array - only run once on mount

	const scrollToDashboard = () => {
		dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	// New enhanced statistics cards with animations
	const StatCard = ({ icon, title, value, unit, trend, color }: { 
		icon: React.ReactNode; 
		title: string; 
		value: number | string; 
		unit: string; 
		trend?: string; 
		color: string;
	}) => (
		<motion.div 
			className="relative flex flex-col items-center rounded-3xl border border-slate-100/80 bg-white/80 p-6 text-center shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
			whileHover={{ y: -8, scale: 1.03 }}
			transition={{ type: "spring", stiffness: 300 }}
		>
			<div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
			<div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-md`}>
				{icon}
			</div>
			<p className="mb-2 text-sm text-muted-foreground">{title}</p>
			<div className="flex items-baseline gap-2">
				<span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					{value}
				</span>
				<span className="text-base font-medium text-muted-foreground">{unit}</span>
			</div>
			{trend && (
				<div className="mt-3 flex items-center text-sm font-medium text-emerald-600">
					<TrendingUp className="mr-1 h-4 w-4" />
					<span>{trend}</span>
				</div>
			)}
		</motion.div>
	);

	// Enhanced feature card component
	const FeatureCard = ({ icon, title, description, link, delay }: {
		icon: React.ReactNode;
		title: string;
		description: string;
		link: string;
		delay: number;
	}) => (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.5 }}
			whileHover={{ y: -10 }}
			className="group relative flex h-full flex-col rounded-3xl border border-slate-100/80 bg-white/70 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
		>
			<div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
			<div className="relative z-10 flex h-full flex-col">
				<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 shadow-sm">
					{icon}
				</div>
				<h3 className="mb-3 text-xl font-semibold text-slate-900">{title}</h3>
				<p className="mb-6 flex-grow text-muted-foreground">{description}</p>
				<Link href={link} className="group flex items-center text-blue-600 transition-colors hover:text-blue-700">
					<span className="font-medium">ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½</span>
					<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
				</Link>
			</div>
		</motion.div>
	);

	const sectionShell = "relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md";

		const highlightCards = [
		{
			title: "ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½",
			description: "ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½.",
			actionLabel: "ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½",
			href: "/tasks",
			accent: "from-sky-400/20 via-transparent to-indigo-400/20",
			icon: <Rocket className="h-6 w-6 text-indigo-600" />
		},
		{
			title: "ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½",
			description: "ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½.",
			actionLabel: "ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½",
			href: "/time",
			accent: "from-violet-400/15 via-transparent to-purple-400/20",
			icon: <Lightbulb className="h-6 w-6 text-violet-600" />
		},
		{
			title: "ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½",
			description: "ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½.",
			actionLabel: "ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½",
			href: "/notifications",
			accent: "from-emerald-400/15 via-transparent to-teal-400/20",
			icon: <Calendar className="h-6 w-6 text-emerald-600" />
		}
	];

	// Don't render anything until hydrated to prevent hydration mismatch
	if (!isHydrated) {
		return (
			<Layout>
				<div className="min-h-screen bg-background animate-pulse">
					<div className="flex flex-col items-center justify-center h-screen">
						<div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="relative min-h-screen overflow-hidden bg-slate-50">
				<div className="pointer-events-none absolute inset-0 -z-10">
					<div className="absolute inset-x-0 top-0 h-[540px] bg-gradient-to-b from-blue-100 via-transparent to-transparent opacity-80 blur-2xl" />
					<div className="absolute left-[18%] top-[20%] h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
					<div className="absolute right-[12%] top-[40%] h-80 w-80 translate-x-1/3 rounded-full bg-sky-200/35 blur-3xl" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.12),_transparent_60%)]" />
				</div>
				<div className="relative mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6 md:space-y-24 lg:px-8">
					{/* Optimize scrolling behavior with CSS */}
					<style jsx global>{`
						html {
							scroll-behavior: smooth;
						}
						@media (prefers-reduced-motion: reduce) {
							html {
								scroll-behavior: auto;
							}
						}
					`}</style>
					
					{/* Hero section with priority loading for LCP improvement */}
					<section className={`${sectionShell} bg-gradient-to-br from-white via-white/80 to-blue-50`}>
						<div className="absolute inset-0">
							<div className="absolute inset-0 bg-gradient-to-br from-blue-200/25 via-transparent to-purple-200/25" />
							<div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-blue-200/40 blur-2xl" />
							<div className="absolute bottom-0 right-8 h-40 w-40 rounded-full bg-purple-200/40 blur-3xl" />
						</div>
						<div className="relative z-10">
							<Suspense fallback={<SkeletonLoader className="h-64 rounded-lg" />}>
								<HeroSection summary={summary} priority={true} />
							</Suspense>
						</div>

						{/* Enhanced scroll indicator with animation */}
						<div className="relative z-10 mt-12 md:mt-16 flex justify-center">
							<motion.div
								initial={{ y: 0 }}
								animate={{ y: 10 }}
								transition={{ 
									duration: 1.5,
									repeat: Infinity,
									repeatType: "reverse"
								}}
							>
								<Button
									onClick={scrollToDashboard}
									variant="outline"
									size="lg"
									className="group bg-white/85 backdrop-blur-md border-blue-200/60 px-8 py-4 transition-all duration-300 shadow-lg hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50 hover:shadow-xl"
								>
									<span className="text-blue-600 font-medium text-lg">ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½</span>
									<ChevronDown className="text-blue-500 mr-2 h-5 w-5" />
								</Button>
							</motion.div>
						</div>
					</section>

					{/* Curated quick actions */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-blue-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 via-transparent to-purple-200/20" />
							<div className="relative z-10 space-y-10">
								<div className="flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-between md:text-right">
									<div className="space-y-3">
										<h2 className="text-3xl font-bold text-primary md:text-4xl">ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½</h2>
										<p className="text-muted-foreground md:text-lg">ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½.</p>
									</div>
									<div className="flex justify-center md:justify-end">
										<Badge className="border-0 bg-blue-50 text-blue-600">ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½ ï؟½ï؟½ï؟½ï؟½ï؟½ï؟½</Badge>
									</div>
								</div>
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{highlightCards.map((card) => (
										<div key={card.title} className="group relative overflow-hidden rounded-2xl border border-slate-100/70 bg-white/80 p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
											<div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
											<div className="relative z-10 flex h-full flex-col gap-4">
												<div className="flex items-center justify-between">
													<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5">
														{card.icon}
													</div>
													<Sparkles className="h-5 w-5 text-blue-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
												</div>
												<h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
												<p className="flex-grow text-sm text-muted-foreground md:text-base">{card.description}</p>
												<Link
													href={card.href}
													className="group/link inline-flex items-center self-start rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100"
												>
													{card.actionLabel}
													<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
												</Link>
											</div>
										</div>
									))}
								</div>
							</div>
						</section>
					</LazyLoadSection>

					{/* Enhanced Statistics Overview Section */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-cyan-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-cyan-200/25 via-transparent to-blue-200/25" />
							<div className="relative z-10">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5 }}
									className="text-center mb-12"
								>
									<h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary flex items-center justify-center gap-2"><span>لوحة الأداء الأسبوعي</span>
										<Award className="h-8 w-8 text-yellow-500" />
									</h2>
									<p className="text-muted-foreground max-w-2xl mx-auto text-lg">راقب مؤشراتك الرئيسية لحظة بلحظة وحدد مناطق التحسين قبل أن تتراكم المهام.</p>
								</motion.div>

								<motion.div
									variants={scrollVariants.staggerChildren}
									initial="initial"
									whileInView="whileInView"
									className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
								>
									<motion.div variants={scrollVariants.staggerItem}>
																		<StatCard
									icon={<Clock className="h-8 w-8 text-blue-600" />}
									title="إجمالي وقت الدراسة"
									value={summary ? Math.round(summary.totalMinutes / 60) : 0}
									unit="ساعة"
									color="from-blue-100 to-blue-200"
								/>
									</motion.div>

									<motion.div variants={scrollVariants.staggerItem}>
																		<StatCard
									icon={<Flame className="h-8 w-8 text-orange-600" />}
									title="أيام الإنجاز المتتالية"
									value={summary?.streakDays ?? 0}
									unit="يوم"
									color="from-orange-100 to-orange-200"
								/>
									</motion.div>

									<motion.div variants={scrollVariants.staggerItem}>
																		<StatCard
									icon={<CheckCircle2 className="h-8 w-8 text-purple-600" />}
									title="المهام المكتملة"
									value={summary?.tasksCompleted ?? 0}
									unit="مهمة"
									color="from-purple-100 to-purple-200"
								/>
									</motion.div>

									<motion.div variants={scrollVariants.staggerItem}>
																		<StatCard
									icon={<Target className="h-8 w-8 text-green-600" />}
									title="نسبة الالتزام الأسبوعية"
									value={summary?.averageFocus ?? 0}
									unit="%"
									color="from-green-100 to-green-200"
								/>
									</motion.div>
								</motion.div>
							</div>
						</section>
					</LazyLoadSection>

					{/* Enhanced Features Section */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-indigo-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-indigo-200/25 via-transparent to-purple-200/25" />
							<div className="relative z-10">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5 }}
									className="text-center mb-12"
								>
									<h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary flex items-center justify-center gap-2"><span>لوحة الأداء الأسبوعي</span>
										<Sparkles className="h-8 w-8 text-yellow-500" />
									</h2>
									<p className="text-muted-foreground max-w-2xl mx-auto text-lg">راقب مؤشراتك الرئيسية لحظة بلحظة وحدد مناطق التحسين قبل أن تتراكم المهام.</p>
								</motion.div>

								<div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
									<FeatureCard
										icon={<Brain className="h-8 w-8 text-blue-600" />}
										title="ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ ط¨ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ"
										description=""
										link="/ai"
										delay={0.1}
									/>

									<FeatureCard
										icon={<BarChart3 className="h-8 w-8 text-purple-600" />}
										title="طھط­ظ„ظٹظ„ط§طھ ظ…طھظ‚ط¯ظ…ط© ظˆطھظ‚ط§ط±ظٹط± ظ…ظپطµظ„ط©"
										description=""
										link="/analytics"
										delay={0.2}
									/>

									<FeatureCard
										icon={<FileText className="h-8 w-8 text-green-600" />}
										title="ط§ظ…طھط­ط§ظ†ط§طھ طھط¬ط±ظٹط¨ظٹط© طھظپط§ط¹ظ„ظٹط©"
										description=""
										link="/exams"
										delay={0.3}
									/>

									<FeatureCard
										icon={<MessageSquare className="h-8 w-8 text-amber-600" />}
										title="ظ…ظ†طھط¯ظ‰ طھظپط§ط¹ظ„ظٹ ظ„ظ„ظ…ط°ط§ظƒط±ط©"
										description=""
										link="/forum"
										delay={0.4}
									/>

									<FeatureCard
										icon={<Calendar className="h-8 w-8 text-red-600" />}
										title="ط¬ط¯ظˆظ„ط© ط°ظƒظٹط© ظ„ظ„ظ…ط°ط§ظƒط±ط©"
										description=""
										link="/schedule"
										delay={0.5}
									/>

									<FeatureCard
										icon={<Trophy className="h-8 w-8 text-indigo-600" />}
										title="ظ†ط¸ط§ظ… ط¥ظ†ط¬ط§ط²ط§طھ ظˆظ…ظƒط§ظپط¢طھ"
										description=""
										link="/achievements"
										delay={0.6}
									/>
								</div>
							</div>
						</section>
					</LazyLoadSection>

					{/* Advanced Search section */}
					<LazyLoadSection>
						<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
							<AdvancedSearchSection />
						</Suspense>
					</LazyLoadSection>

					{/* Intelligent Recommendations section */}
					<LazyLoadSection>
						<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
							<IntelligentRecommendationsSection />
						</Suspense>
					</LazyLoadSection>

					{/* Live Activity Feed section */}
					<LazyLoadSection>
						<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
							<LiveActivityFeedSection />
						</Suspense>
					</LazyLoadSection>

					{/* Quick Links section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-indigo-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-indigo-200/25 via-transparent to-purple-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<QuickLinksSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Daily Tips section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-emerald-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-emerald-200/25 via-transparent to-teal-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<TipsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Achievements section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-amber-100/60`} ref={dashboardRef}>
							<div className="absolute inset-0 bg-gradient-to-br from-amber-200/25 via-transparent to-orange-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<AchievementsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Exams section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-rose-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-rose-200/25 via-transparent to-pink-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<ExamsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Analytics section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-sky-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-blue-200/25 via-transparent to-cyan-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<AnalyticsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Performance Dashboard section */}
					<LazyLoadSection>
						<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
							<PerformanceDashboardSection />
						</Suspense>
					</LazyLoadSection>

					{/* Progress Predictions section */}
					<LazyLoadSection>
						<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
							<ProgressPredictionsSection />
						</Suspense>
					</LazyLoadSection>

					{/* Social Features section */}
					<LazyLoadSection>
						<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
							<SocialFeaturesSection />
						</Suspense>
					</LazyLoadSection>

					{/* Status Indicators section */}
					<LazyLoadSection>
						<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
							<StatusIndicatorsSection />
						</Suspense>
					</LazyLoadSection>

					{/* Blog section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-violet-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-violet-200/25 via-transparent to-indigo-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<BlogSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Features section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-fuchsia-100/60`}>
							<div className="absolute inset-0 bg-gradient-to-br from-purple-200/25 via-transparent to-pink-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<FeaturesSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Contact section with lazy loading */}
					<LazyLoadSection>
						<section className={`${sectionShell} ring-1 ring-slate-200/70`}>
							<div className="absolute inset-0 bg-gradient-to-br from-slate-200/25 via-transparent to-blue-200/25" />
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<ContactSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>
				</div>
			</div>
		</Layout>
	);
}

export default Home;

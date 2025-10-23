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

		let id = localStorage.getItem(LOCAL_USER_KEY);
		if (!id) {
			try {
				const res = await fetch("/api/users/guest", {
					method: "POST",
					next: { revalidate: 3600 } // Revalidate every hour
				});
				if (res.ok) {
					const data = await res.json();
					id = data.id;
					if (id) {
						localStorage.setItem(LOCAL_USER_KEY, id);
					}
				}
			} catch (error) {
				console.warn("Failed to create guest user:", error);
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
					}, false, "حدث خطأ أثناء تحليل البيانات");
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
			}, false, "حدث خطأ أثناء تحميل الإحصائيات");
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
			className={`rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center ${color}`}
			whileHover={{ y: -8, scale: 1.03 }}
			transition={{ type: "spring", stiffness: 300 }}
		>
			<div className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-md`}>
				{icon}
			</div>
			<p className="text-sm text-muted-foreground mb-2">{title}</p>
			<p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{value} {unit}</p>
			{trend && (
				<div className="flex items-center mt-3 text-green-600 text-sm font-medium">
					<TrendingUp className="h-4 w-4 mr-1" />
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
			className="h-full bg-white/80 backdrop-blur-sm rounded-2xl border p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col"
		>
			<div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
				{icon}
			</div>
			<h3 className="text-xl font-bold mb-3">{title}</h3>
			<p className="text-muted-foreground mb-4 flex-grow">{description}</p>
			<Link href={link} className="text-blue-600 font-medium flex items-center group">
				اكتشف المزيد
				<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
			</Link>
		</motion.div>
	);

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
			<div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-white py-8 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto space-y-16 md:space-y-24">
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
						@keyframes blob {
							0% {
								transform: translate(0px, 0px) scale(1);
							}
							33% {
								transform: translate(30px, -50px) scale(1.1);
							}
							66% {
								transform: translate(-20px, 20px) scale(0.9);
							}
							100% {
								transform: translate(0px, 0px) scale(1);
							}
						}
						.animate-blob {
							animation: blob 7s infinite;
						}
						.animation-delay-2000 {
							animation-delay: 2s;
						}
						.animation-delay-4000 {
							animation-delay: 4s;
						}
					`}</style>
					
					{/* Hero section with priority loading for LCP improvement */}
					<section className="py-12 md:py-20 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-3xl px-6 md:px-12 shadow-xl border border-blue-50 overflow-hidden relative">
						<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
						<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
						<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
						<div className="relative z-10">
							<Suspense fallback={<SkeletonLoader className="h-64 rounded-lg" />}>
								<HeroSection summary={summary} priority={true} />
							</Suspense>
						</div>

						{/* Enhanced scroll indicator with animation */}
						<div className="flex justify-center mt-12 md:mt-16">
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
									className="group bg-white/80 backdrop-blur-sm border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl px-8 py-4"
								>
									<span className="text-blue-600 font-medium text-lg">استكشف المزيد من الميزات</span>
									<ChevronDown className="text-blue-500 mr-2 h-5 w-5" />
								</Button>
							</motion.div>
						</div>
					</section>

					{/* Enhanced Statistics Overview Section */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-3xl px-6 md:px-12 shadow-xl border border-cyan-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-cyan-300/10 to-blue-300/10"></div>
							<div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
							<div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
							<div className="relative z-10">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5 }}
									className="text-center mb-12"
								>
									<h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
										<span>نظرة عامة على تقدمك</span>
										<Award className="h-8 w-8 text-yellow-500" />
									</h2>
									<p className="text-muted-foreground max-w-2xl mx-auto text-lg">
										تتبع تقدمك الأكاديمي بكل تفصيل واكتشف نقاط قوتك ومجالات التحسين
									</p>
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
											title="إجمالي ساعات الدراسة"
											value={summary ? Math.round(summary.totalMinutes / 60) : 0}
											unit="ساعة"
											color="from-blue-100 to-blue-200"
										/>
									</motion.div>

									<motion.div variants={scrollVariants.staggerItem}>
										<StatCard
											icon={<Flame className="h-8 w-8 text-orange-600" />}
											title="أيام المداومة"
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
											title="معدل التركيز"
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
						<section className="py-8 md:py-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl px-6 md:px-12 shadow-xl border border-indigo-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-indigo-300/10 to-purple-300/10"></div>
							<div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
							<div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
							<div className="relative z-10">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5 }}
									className="text-center mb-12"
								>
									<h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
										<span>ميزات متطورة لتعليم أفضل</span>
										<Sparkles className="h-8 w-8 text-yellow-500" />
									</h2>
									<p className="text-muted-foreground max-w-2xl mx-auto text-lg">
										اكتشف مجموعة الأدوات المتقدمة المصممة خصيصاً لتحسين تجربتك التعليمية
									</p>
								</motion.div>

								<div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
									<FeatureCard
										icon={<Brain className="h-8 w-8 text-blue-600" />}
										title="المساعد الذكي بالذكاء الاصطناعي"
										description=""
										link="/ai"
										delay={0.1}
									/>

									<FeatureCard
										icon={<BarChart3 className="h-8 w-8 text-purple-600" />}
										title="تحليلات متقدمة وتقارير مفصلة"
										description=""
										link="/analytics"
										delay={0.2}
									/>

									<FeatureCard
										icon={<FileText className="h-8 w-8 text-green-600" />}
										title="امتحانات تجريبية تفاعلية"
										description=""
										link="/exams"
										delay={0.3}
									/>

									<FeatureCard
										icon={<MessageSquare className="h-8 w-8 text-amber-600" />}
										title="منتدى تفاعلي للمذاكرة"
										description=""
										link="/forum"
										delay={0.4}
									/>

									<FeatureCard
										icon={<Calendar className="h-8 w-8 text-red-600" />}
										title="جدولة ذكية للمذاكرة"
										description=""
										link="/schedule"
										delay={0.5}
									/>

									<FeatureCard
										icon={<Trophy className="h-8 w-8 text-indigo-600" />}
										title="نظام إنجازات ومكافآت"
										description=""
										link="/achievements"
										delay={0.6}
									/>
								</div>
							</div>
						</section>
					</LazyLoadSection>

					{/* Quick Links section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl px-6 md:px-12 shadow-xl border border-indigo-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-indigo-300/10 to-purple-300/10"></div>
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<QuickLinksSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Daily Tips section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-green-50 to-teal-50 rounded-3xl px-6 md:px-12 shadow-xl border border-green-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-green-300/10 to-teal-300/10"></div>
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<TipsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Achievements section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl px-6 md:px-12 shadow-xl border border-yellow-50 relative overflow-hidden" ref={dashboardRef}>
							<div className="absolute inset-0 bg-gradient-to-r from-yellow-300/10 to-orange-300/10"></div>
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<AchievementsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Exams section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-red-50 to-pink-50 rounded-3xl px-6 md:px-12 shadow-xl border border-red-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-red-300/10 to-pink-300/10"></div>
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<ExamsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Analytics section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-3xl px-6 md:px-12 shadow-xl border border-blue-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-blue-300/10 to-cyan-300/10"></div>
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<AnalyticsSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Blog section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl px-6 md:px-12 shadow-xl border border-purple-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-purple-300/10 to-indigo-300/10"></div>
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<BlogSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Features section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl px-6 md:px-12 shadow-xl border border-purple-50 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10"></div>
							<div className="relative z-10">
								<Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
									<FeaturesSection />
								</Suspense>
							</div>
						</section>
					</LazyLoadSection>

					{/* Contact section with lazy loading */}
					<LazyLoadSection>
						<section className="py-8 md:py-16 bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl px-6 md:px-12 shadow-xl border border-gray-100 relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-gray-200/10 to-blue-200/10"></div>
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

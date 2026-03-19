"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAchievements } from './hooks/useAchievements';
import { AchievementStats } from './components/AchievementStats';
import { AchievementFilters } from './components/AchievementFilters';
import { AchievementCard } from './components/AchievementCard';
import { EmptyState } from './components/EmptyState';
import { LoadingState } from './components/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Sparkles, Info, Clock, BookOpen, Lock, Star, Target, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function AchievementsPage() {
	const {
		achievements,
		filteredAchievements,
		userProgress,
		stats,
		loading,
		error,
		filters,
		setFilters,
		refetch,
	} = useAchievements();

	const [recentAchievements, setRecentAchievements] = useState<string[]>([]);
	const [showCelebration, setShowCelebration] = useState(false);

	// Track newly earned achievements
	useEffect(() => {
		if (achievements.length > 0) {
			const earned = achievements.filter((a) => a.isEarned && a.earnedAt);
			const sorted = earned.sort(
				(a, b) =>
					new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime()
			);
			const recentIds = sorted.slice(0, 3).map((a) => a.id);
			setRecentAchievements(recentIds);
			
			// Show celebration if there are very recent achievements (earned in last 24h)
			const twentyFourHours = 24 * 60 * 60 * 1000;
			const hasRecent = sorted.some(a => 
				new Date().getTime() - new Date(a.earnedAt || 0).getTime() < twentyFourHours
			);
			if (hasRecent) setShowCelebration(true);
		}
	}, [achievements]);

	return (
		<div className="min-h-screen bg-background relative overflow-hidden">
			{/* Decorative Background Elements */}
			<div className="absolute top-0 left-0 w-full h-96 bg-primary/5 rounded-b-[100%] blur-[100px] pointer-events-none -z-10" />
			<div className="absolute top-40 right-10 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none -z-10 animate-pulse duration-1000" />
			<div className="absolute top-60 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none -z-10 animate-pulse duration-1000 delay-500" />

			<div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
				{/* Hero Header Section */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, ease: "easeOut" }}
					className="mb-10 relative"
				>
					<div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-xl border-b border-border/50 p-6 lg:p-10 rounded-3xl shadow-sm relative overflow-hidden">
						{/* Glowing border effect */}
						<div className="absolute inset-0 border border-primary/20 rounded-3xl pointer-events-none" />
						<div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

						<div className="flex items-center gap-6 z-10 w-full lg:w-auto">
							<motion.div
								initial={{ scale: 0.8, rotate: -15 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ 
									type: "spring", stiffness: 200, damping: 12, 
									delay: 0.2 
								}}
								className="relative group"
							>
								<div className="absolute inset-0 bg-yellow-500/30 blur-xl rounded-full scale-150 group-hover:bg-yellow-500/40 transition-colors duration-500" />
								<div className="relative bg-gradient-to-br from-yellow-400 to-yellow-600 p-5 rounded-3xl shadow-xl shadow-yellow-500/20 transform group-hover:-translate-y-1 transition-transform duration-300">
									<Trophy className="h-12 w-12 text-white" />
								</div>
							</motion.div>
							
							<div className="text-right">
								<motion.h1 
									className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent mb-2"
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.3 }}
								>
									سجل الإنجازات
								</motion.h1>
								<motion.p 
									className="text-muted-foreground text-lg"
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.4 }}
								>
									رحلة نجاحك وتفوقك موثقة هنا خطوة بخطوة
								</motion.p>
							</div>
						</div>

						{userProgress && (
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.5 }}
								className="z-10 w-full lg:w-auto"
							>
								<Card className="border-0 bg-background/60 shadow-lg backdrop-blur-md overflow-hidden relative">
									<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 to-purple-500/50" />
									<CardContent className="p-5 flex items-center justify-between gap-6">
										<div className="text-center w-24">
											<div className="text-4xl font-black bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">
												{userProgress.level}
											</div>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">المستوى</div>
										</div>
										
										<div className="w-px h-16 bg-gradient-to-b from-transparent via-border to-transparent" />
										
										<div className="text-center w-32">
											<div className="text-3xl font-bold flex items-center justify-center gap-1.5">
												<Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
												<span className="text-foreground">{userProgress.totalXP.toLocaleString()}</span>
											</div>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">نقاط XP</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						)}
					</div>
				</motion.div>

				{/* Loading State */}
				{loading && <LoadingState />}

				{/* Error State */}
				{error && (
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
						<Card className="border-destructive/50 bg-destructive/5 shadow-destructive/10 mb-8 overflow-hidden rounded-2xl">
							<CardContent className="p-6">
								<div className="flex flex-col sm:flex-row items-center gap-4 text-destructive text-center sm:text-right">
									<div className="bg-destructive/10 p-3 rounded-full">
										<Info className="h-6 w-6" />
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-lg">حدث خطأ في تحميل البيانات</h3>
										<p className="text-sm opacity-80 mt-1">{error}</p>
									</div>
									<Button variant="destructive" size="sm" onClick={refetch} className="w-full sm:w-auto mt-4 sm:mt-0 shadow-lg shadow-destructive/20 rounded-xl">
										إعادة المحاولة
									</Button>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				)}

				{/* Main Content */}
				{!loading && !error && (
					<div className="space-y-10">
						{/* Setup Celebration Animation if needed */}
						<AnimatePresence>
							{showCelebration && (
								<motion.div 
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className="bg-gradient-to-r from-yellow-500/20 via-primary/20 to-purple-500/20 rounded-3xl p-1 mb-8"
								>
									<div className="bg-background/80 backdrop-blur-xl rounded-[22px] p-6 flex items-center justify-between">
										<div className="flex items-center gap-4">
											<span className="text-4xl animate-bounce">🎉</span>
											<div>
												<h3 className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-primary bg-clip-text text-transparent">
													تهانينا! لقد حصلت على إنجازات جديدة
												</h3>
												<p className="text-muted-foreground mt-1 text-sm">أنت تقوم بعمل رائع، استمر في التقدم!</p>
											</div>
										</div>
										<Button variant="ghost" size="icon" onClick={() => setShowCelebration(false)} className="rounded-full bg-background/50 hover:bg-background">
											<span className="sr-only">إغلاق</span>
											<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
										</Button>
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Statistics */}
						{stats && (
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1, duration: 0.5 }}
							>
								<AchievementStats stats={stats} userProgress={userProgress} />
							</motion.div>
						)}

						{/* Quick Overview Badges */}
						<motion.div 
							className="flex flex-wrap gap-3"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.2 }}
						>
							<div className="flex items-center gap-2 bg-secondary/40 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 text-sm font-medium">
								<Trophy className="w-4 h-4 text-primary" />
								<span>إجمالي الإنجازات: {achievements.length}</span>
							</div>
							<div className="flex items-center gap-2 bg-secondary/40 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 text-sm font-medium">
								<Star className="w-4 h-4 text-yellow-500" />
								<span>تم اكتساب: {stats?.earned || 0}</span>
							</div>
							<div className="flex items-center gap-2 bg-secondary/40 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 text-sm font-medium">
								<Lock className="w-4 h-4 text-muted-foreground" />
								<span>متبقي: {stats?.locked || 0}</span>
							</div>
						</motion.div>

						{/* Grid Layout Layout for Filters and content */}
						<div className="flex flex-col xl:flex-row gap-8">
							
							{/* Left Sidebar for Filters */}
							<div className="xl:w-80 flex-shrink-0">
								<div className="sticky top-24">
									<AchievementFilters filters={filters} onFiltersChange={setFilters} />
								</div>
							</div>

							{/* Right Content Area */}
							<div className="flex-1 space-y-10 min-w-0">
								{/* Recent Achievements Section */}
								{recentAchievements.length > 0 && filters.status === 'all' && filters.category === 'all' && filters.search === '' && (
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.2 }}
										className="relative"
									>
										<div className="flex items-center justify-between mb-6">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-yellow-500/10 rounded-xl relative">
													<div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-xl" />
													<Sparkles className="h-6 w-6 text-yellow-500 relative z-10" />
												</div>
												<h2 className="text-2xl font-bold bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">أحدث إنجازاتك</h2>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
											{filteredAchievements
												.filter((a) => recentAchievements.includes(a.id))
												.map((achievement, index) => (
													<AchievementCard
														key={`recent-${achievement.id}`}
														achievement={achievement}
														index={index}
													/>
												))}
										</div>
									</motion.div>
								)}

								{/* All Achievements Grid */}
								<div>
									<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
										<h2 className="text-2xl font-bold bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
											معرض الإنجازات
											{filteredAchievements.length !== achievements.length && (
												<Badge variant="default" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 font-semibold rounded-full">
													{filteredAchievements.length} نتيجة
												</Badge>
											)}
										</h2>
									</div>

									{filteredAchievements.length === 0 ? (
										<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
											<Card className="border-dashed border-2 bg-transparent shadow-none">
												<CardContent className="p-12 text-center flex flex-col items-center">
													<div className="p-4 bg-muted rounded-full mb-4">
														<Search className="w-8 h-8 text-muted-foreground opacity-50" />
													</div>
													<h3 className="text-xl font-semibold mb-2">لا توجد إنجازات تطابق الفلترة</h3>
													<p className="text-muted-foreground mb-6 max-w-sm mx-auto">
														لم نتمكن من العثور على أي إنجازات تطابق معايير البحث الحالية. جرب تغيير الفلاتر.
													</p>
													<Button
														variant="default"
														onClick={() =>
															setFilters({
																search: '',
																category: 'all',
																difficulty: 'all',
																status: 'all',
															})
														}
														className="rounded-xl shadow-lg shadow-primary/20"
													>
														إعادة تعيين الفلاتر
													</Button>
												</CardContent>
											</Card>
										</motion.div>
									) : achievements.length === 0 ? (
										<EmptyState />
									) : (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
										>
											<AnimatePresence mode="popLayout">
												{filteredAchievements.map((achievement, index) => (
													<motion.div
														key={achievement.id}
														layout
														initial={{ opacity: 0, scale: 0.8 }}
														animate={{ opacity: 1, scale: 1 }}
														exit={{ opacity: 0, scale: 0.8 }}
														transition={{ duration: 0.3, delay: index * 0.03 }}
													>
														<AchievementCard
															achievement={achievement}
															index={index}
														/>
													</motion.div>
												))}
											</AnimatePresence>
										</motion.div>
									)}
								</div>
							</div>
						</div>

						{/* Info Section - Stunning visual redesign */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
						>
							<Card className="border-0 bg-gradient-to-br from-card to-card/50 shadow-xl overflow-hidden relative rounded-[2rem]">
								<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
								<div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none translate-y-1/2 -translate-x-1/3" />
								
								<CardHeader className="pb-2 relative z-10 px-8 pt-8">
									<CardTitle className="flex items-center gap-3 text-2xl font-bold">
										<div className="p-2.5 bg-primary/10 rounded-2xl">
											<Info className="h-6 w-6 text-primary" />
										</div>
										كيفية الحصول على المزيد من الإنجازات
									</CardTitle>
								</CardHeader>
								<CardContent className="relative z-10 px-8 pb-8 pt-6">
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
										{[
											{
												icon: <BookOpen className="w-8 h-8 text-blue-500" />,
												bg: "bg-blue-500/10",
												border: "border-blue-500/20",
												title: "الدراسة والمذاكرة",
												items: ["دراسة لمدة 10/50/100 ساعة", "الدراسة لعدة أيام متتالية", "استكمال المواد التعليمية"]
											},
											{
												icon: <Target className="w-8 h-8 text-green-500" />,
												bg: "bg-green-500/10",
												border: "border-green-500/20",
												title: "إنجاز المهام",
												items: ["إكمال 10/50/100 مهمة", "إكمال جميع مهام الأسبوع", "التنويع بين مواد مختلفة"]
											},
											{
												icon: <Zap className="w-8 h-8 text-yellow-500" />,
												bg: "bg-yellow-500/10",
												border: "border-yellow-500/20",
												title: "الامتحانات والتفوق",
												items: ["الحصول على درجات عالية 90%+", "إكمال امتحانات التدريب", "تحسين نتائجك باستمرار"]
											},
											{
												icon: <Clock className="w-8 h-8 text-purple-500" />,
												bg: "bg-purple-500/10",
												border: "border-purple-500/20",
												title: "إدارة الوقت",
												items: ["استخدام بومودورو بانتظام", "جلسات دراسة عميقة", "الالتزام بالجدول بدقة"]
											}
										].map((item, i) => (
											<motion.div 
												key={i}
												whileHover={{ y: -5, transition: { duration: 0.2 } }}
												className={`p-6 rounded-3xl border ${item.bg} ${item.border} backdrop-blur-sm relative overflow-hidden group`}
											>
												<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform translate-x-4 -translate-y-4 scale-150">
													{item.icon}
												</div>
												<div className="bg-background/80 p-3 rounded-2xl w-max mb-4 shadow-sm">
													{item.icon}
												</div>
												<h3 className="font-bold text-lg mb-4 text-foreground/90">{item.title}</h3>
												<ul className="space-y-2.5">
													{item.items.map((line, j) => (
														<li key={j} className="text-sm font-medium text-muted-foreground flex items-start gap-2">
															<span className="w-1.5 h-1.5 rounded-full bg-foreground/30 mt-1.5 flex-shrink-0" />
															<span className="leading-relaxed">{line}</span>
														</li>
													))}
												</ul>
											</motion.div>
										))}
									</div>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				)}
			</div>
		</div>
	);
}

// Need to import Search for Empty filter state
import { Search } from 'lucide-react';

"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAchievements } from './hooks/useAchievements';
import { AchievementStats } from './components/AchievementStats';
import { AchievementFilters } from './components/AchievementFilters';
import { AchievementCard } from './components/AchievementCard';
import { EmptyState } from './components/EmptyState';
import { LoadingState } from './components/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/card';
import { Button } from '@/shared/button';
import { Badge } from '@/shared/badge';
import { Trophy, TrendingUp, Sparkles, Info } from 'lucide-react';

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

	// Track newly earned achievements
	useEffect(() => {
		if (achievements.length > 0) {
			const earned = achievements.filter((a) => a.isEarned && a.earnedAt);
			const sorted = earned.sort(
				(a, b) =>
					new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime()
			);
			setRecentAchievements(sorted.slice(0, 3).map((a) => a.id));
		}
	}, [achievements]);

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-8"
				>
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<motion.div
								animate={{ rotate: [0, 10, -10, 0] }}
								transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
							>
								<Trophy className="h-10 w-10 text-yellow-500" />
							</motion.div>
							<div>
								<h1 className="text-4xl font-bold">إنجازاتك</h1>
								<p className="text-muted-foreground mt-1">
									تابع تقدمك وإنجازاتك المكتسبة
								</p>
							</div>
						</div>
						{userProgress && (
							<Card className="border-2">
								<CardContent className="p-4">
									<div className="flex items-center gap-4">
										<div className="text-center">
											<div className="text-2xl font-bold">{userProgress.level}</div>
											<div className="text-xs text-muted-foreground">المستوى</div>
										</div>
										<div className="h-12 w-px bg-border" />
										<div className="text-center">
											<div className="text-2xl font-bold flex items-center gap-1">
												<TrendingUp className="h-4 w-4 text-primary" />
												{userProgress.totalXP.toLocaleString()}
											</div>
											<div className="text-xs text-muted-foreground">نقطة XP</div>
										</div>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</motion.div>

				{/* Loading State */}
				{loading && <LoadingState />}

				{/* Error State */}
				{error && (
					<Card className="border-destructive mb-6">
						<CardContent className="p-6">
							<div className="flex items-center gap-3 text-destructive">
								<Info className="h-5 w-5" />
								<div>
									<h3 className="font-semibold">حدث خطأ</h3>
									<p className="text-sm">{error}</p>
								</div>
								<Button variant="outline" size="sm" onClick={refetch} className="mr-auto">
									إعادة المحاولة
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Main Content */}
				{!loading && !error && (
					<>
						{/* Statistics */}
						{stats && (
							<AchievementStats stats={stats} userProgress={userProgress} />
						)}

						{/* Filters */}
						<AchievementFilters filters={filters} onFiltersChange={setFilters} />

						{/* Recent Achievements Section */}
						{recentAchievements.length > 0 && filteredAchievements.filter((a) =>
							recentAchievements.includes(a.id)
						).length > 0 && (
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="mb-8"
							>
								<div className="flex items-center gap-2 mb-4">
									<Sparkles className="h-5 w-5 text-yellow-500" />
									<h2 className="text-xl font-semibold">إنجازاتك الأخيرة</h2>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
									{filteredAchievements
										.filter((a) => recentAchievements.includes(a.id))
										.map((achievement) => (
											<AchievementCard
												key={achievement.id}
												achievement={achievement}
											/>
										))}
								</div>
							</motion.div>
						)}

						{/* Achievements Grid */}
						<div className="mb-8">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold">
									جميع الإنجازات
									{filteredAchievements.length !== achievements.length && (
										<Badge variant="secondary" className="mr-2">
											{filteredAchievements.length} من {achievements.length}
										</Badge>
									)}
								</h2>
							</div>

							{filteredAchievements.length === 0 ? (
								<Card>
									<CardContent className="p-8 text-center">
										<p className="text-muted-foreground">
											لا توجد إنجازات تطابق الفلترة المحددة
										</p>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setFilters({
													search: '',
													category: 'all',
													difficulty: 'all',
													status: 'all',
												})
											}
											className="mt-4"
										>
											إعادة تعيين الفلاتر
										</Button>
									</CardContent>
								</Card>
							) : achievements.length === 0 ? (
								<EmptyState />
							) : (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
								>
									{filteredAchievements.map((achievement, index) => (
										<AchievementCard
											key={achievement.id}
											achievement={achievement}
											index={index}
										/>
									))}
								</motion.div>
							)}
						</div>

						{/* Info Section */}
						<Card className="border-2">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Info className="h-5 w-5" />
									كيفية الحصول على المزيد من الإنجازات
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									<div className="p-4 rounded-lg border bg-secondary/30">
										<div className="text-2xl mb-2">📚</div>
										<h3 className="font-medium mb-2">إنجازات الدراسة</h3>
										<ul className="text-sm text-muted-foreground space-y-1">
											<li>• دراسة لمدة 10 ساعات</li>
											<li>• دراسة لمدة 50 ساعة</li>
											<li>• دراسة لمدة 100 ساعة</li>
											<li>• دراسة 7 أيام متتالية</li>
											<li>• دراسة 30 يوم متتالي</li>
										</ul>
									</div>
									<div className="p-4 rounded-lg border bg-secondary/30">
										<div className="text-2xl mb-2">✅</div>
										<h3 className="font-medium mb-2">إنجازات المهام</h3>
										<ul className="text-sm text-muted-foreground space-y-1">
											<li>• إكمال 10 مهام</li>
											<li>• إكمال 50 مهمة</li>
											<li>• إكمال 100 مهمة</li>
											<li>• إكمال جميع مهام الأسبوع</li>
											<li>• إكمال مهام في جميع المواد</li>
										</ul>
									</div>
									<div className="p-4 rounded-lg border bg-secondary/30">
										<div className="text-2xl mb-2">📊</div>
										<h3 className="font-medium mb-2">إنجازات الامتحانات</h3>
										<ul className="text-sm text-muted-foreground space-y-1">
											<li>• الحصول على 80% في امتحان</li>
											<li>• الحصول على 90% في امتحان</li>
											<li>• إكمال 5 امتحانات</li>
											<li>• إكمال امتحان في كل مادة</li>
											<li>• تحسين النتيجة بنسبة 20%</li>
										</ul>
									</div>
									<div className="p-4 rounded-lg border bg-secondary/30">
										<div className="text-2xl mb-2">⏱️</div>
										<h3 className="font-medium mb-2">إنجازات الوقت</h3>
										<ul className="text-sm text-muted-foreground space-y-1">
											<li>• استخدام تقنية البومودورو 10 مرات</li>
											<li>• استخدام تقنية البومودورو 50 مرة</li>
											<li>• إكمال 5 جلسات دراسة عميقة</li>
											<li>• الالتزام بالجدول الأسبوعي</li>
											<li>• تحقيق أهداف أسبوعية 4 أسابيع متتالية</li>
										</ul>
									</div>
								</div>
							</CardContent>
						</Card>
					</>
				)}
			</div>
		</div>
	);
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/card';
import { AchievementStats as StatsType } from '../types';
import { getCategoryIcon, getCategoryLabel } from '../utils';
import { Trophy, Target, Lock, TrendingUp, Award } from 'lucide-react';

interface AchievementStatsProps {
	stats: StatsType | null;
	userProgress: { totalXP: number; level: number } | null;
}

export function AchievementStats({ stats, userProgress }: AchievementStatsProps) {
	if (!stats) return null;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			{/* Overall Progress */}
			<Card className="border-2">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<Target className="h-4 w-4" />
						التقدم الإجمالي
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-bold">{stats.completionPercentage}%</div>
					<div className="text-xs text-muted-foreground mt-1">
						{stats.earned} من {stats.total}
					</div>
					<div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
						<div
							className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
							style={{ width: `${stats.completionPercentage}%` } as React.CSSProperties}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Total XP */}
			<Card className="border-2">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<TrendingUp className="h-4 w-4" />
						النقاط الإجمالية
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-bold">{userProgress?.totalXP || stats.totalXP}</div>
					<div className="text-xs text-muted-foreground mt-1">
						المستوى {userProgress?.level || 1}
					</div>
				</CardContent>
			</Card>

			{/* Earned */}
			<Card className="border-2 border-green-200 dark:border-green-900/50">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
						الإنجازات المكتسبة
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-bold text-green-600 dark:text-green-400">
						{stats.earned}
					</div>
					<div className="text-xs text-muted-foreground mt-1">من إجمالي {stats.total}</div>
				</CardContent>
			</Card>

			{/* Locked */}
			<Card className="border-2 border-orange-200 dark:border-orange-900/50">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
						الإنجازات المقفلة
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
						{stats.locked}
					</div>
					<div className="text-xs text-muted-foreground mt-1">باقي للحصول عليها</div>
				</CardContent>
			</Card>

			{/* Category Breakdown */}
			<Card className="lg:col-span-2 border-2">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<Award className="h-4 w-4" />
						التوزيع حسب الفئة
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
						{Object.entries(stats.byCategory).map(([category, count]) => (
							<div key={category} className="text-center">
								<div className="text-2xl mb-1">{getCategoryIcon(category as any)}</div>
								<div className="text-lg font-semibold">{count}</div>
								<div className="text-xs text-muted-foreground">
									{getCategoryLabel(category as any)}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Difficulty Breakdown */}
			<Card className="lg:col-span-2 border-2">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<Target className="h-4 w-4" />
						التوزيع حسب الصعوبة
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
							<div key={difficulty} className="text-center">
								<div className="text-lg font-semibold">{count}</div>
								<div className="text-xs text-muted-foreground capitalize">{difficulty}</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}


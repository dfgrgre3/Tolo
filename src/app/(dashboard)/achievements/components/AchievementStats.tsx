"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementStats as StatsType, AchievementCategory, AchievementDifficulty } from '../types';
import { getCategoryIcon, getCategoryLabel } from '../utils';
import { Trophy, Target, Lock, TrendingUp, Award, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface AchievementStatsProps {
	stats: StatsType | null;
	userProgress: { totalXP: number; level: number } | null;
}

export function AchievementStats({ stats, userProgress }: AchievementStatsProps) {
	if (!stats) return null;

	const circleRadius = 38;
	const circleCircumference = 2 * Math.PI * circleRadius;
	const strokeDashoffset = circleCircumference - (stats.completionPercentage / 100) * circleCircumference;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
			{/* Complete Radial Progress Box */}
			<Card className="border-0 bg-gradient-to-br from-card to-card/50 shadow-lg rounded-[1.5rem] relative overflow-hidden group">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
				<CardContent className="p-6 relative z-10 flex flex-col items-center justify-center h-full">
					<div className="relative flex items-center justify-center mb-2 mt-4">
						<svg className="w-28 h-28 transform -rotate-90">
							<circle
								cx="56"
								cy="56"
								r={circleRadius}
								className="stroke-muted/50"
								strokeWidth="8"
								fill="none"
							/>
							<motion.circle
								initial={{ strokeDashoffset: circleCircumference }}
								animate={{ strokeDashoffset }}
								transition={{ duration: 1.5, ease: "easeOut" }}
								cx="56"
								cy="56"
								r={circleRadius}
								className="stroke-primary"
								strokeWidth="8"
								fill="none"
								strokeLinecap="round"
								style={{ strokeDasharray: circleCircumference }}
							/>
						</svg>
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/0">
							<span className="text-3xl font-black text-foreground">{stats.completionPercentage}%</span>
						</div>
					</div>
					<div className="text-center mt-3">
						<h3 className="font-bold text-lg mb-1">التقدم الإجمالي</h3>
						<p className="text-sm font-medium text-muted-foreground">{stats.earned} إنجاز مكتسب من {stats.total}</p>
					</div>
				</CardContent>
			</Card>

			{/* Main Three Info Blocks Container */}
			<div className="grid grid-cols-1 grid-rows-3 gap-5 lg:col-span-1">
				{/* Total XP Mini Card */}
				<Card className="border border-border/50 bg-card shadow-sm rounded-[1rem] hover:border-border transition-colors">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="p-3 bg-yellow-500/10 rounded-xl">
							<Zap className="h-6 w-6 text-yellow-500" />
						</div>
						<div>
							<div className="text-2xl font-bold font-mono">{userProgress?.totalXP.toLocaleString() || stats.totalXP.toLocaleString()}</div>
							<div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">نقاط الخبرة الكلية</div>
						</div>
					</CardContent>
				</Card>

				{/* Earned Mini Card */}
				<Card className="border border-green-500/20 bg-green-500/5 shadow-sm rounded-[1rem] hover:border-green-500/30 transition-colors">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="p-3 bg-green-500/20 rounded-xl">
							<Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<div className="text-2xl font-bold font-mono text-green-700 dark:text-green-300">{stats.earned}</div>
							<div className="text-xs font-semibold text-green-600/70 dark:text-green-400/70 uppercase tracking-widest mt-0.5">إنجازات مفتوحة</div>
						</div>
					</CardContent>
				</Card>

				{/* Locked Mini Card */}
				<Card className="border border-orange-500/20 bg-orange-500/5 shadow-sm rounded-[1rem] hover:border-orange-500/30 transition-colors">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="p-3 bg-orange-500/20 rounded-xl">
							<Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
						</div>
						<div>
							<div className="text-2xl font-bold font-mono text-orange-700 dark:text-orange-300">{stats.locked}</div>
							<div className="text-xs font-semibold text-orange-600/70 dark:text-orange-400/70 uppercase tracking-widest mt-0.5">إنجازات مقفلة</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Category Breakdown */}
			<Card className="lg:col-span-2 border-0 bg-gradient-to-b from-card to-card/50 shadow-lg rounded-[1.5rem]">
				<CardHeader className="pb-2 pt-6 px-6">
					<CardTitle className="text-base font-bold flex items-center gap-2">
						<div className="p-1.5 bg-primary/10 rounded-md">
							<Award className="h-4 w-4 text-primary" />
						</div>
						نظرة عامة على الفئات
					</CardTitle>
				</CardHeader>
				<CardContent className="px-6 pb-6 pt-2">
					<div className="flex flex-wrap md:flex-nowrap justify-between gap-4 h-full items-center">
						{(Object.entries(stats.byCategory) as [AchievementCategory, number][]).map(([category, count], idx) => (
							<motion.div 
								key={category} 
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: idx * 0.1 }}
								className="flex flex-col items-center justify-center flex-1 min-w-[3.5rem] bg-secondary/50 rounded-2xl py-4 border border-border/50 hover:bg-secondary/80 transition-colors"
							>
								<div className="text-3xl mb-2 filter drop-shadow-sm">{getCategoryIcon(category)}</div>
								<div className="text-xl font-bold">{count}</div>
								<div className="text-[10px] font-bold text-muted-foreground mt-1 tracking-wider uppercase">
									{getCategoryLabel(category)}
								</div>
							</motion.div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

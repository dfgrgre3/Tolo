'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Clock, Calendar, Target, TrendingUp, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type WeeklyData = { 
	bySubject: Record<string, number>; 
	byDay: { date: string | Date; minutes: number }[] 
};

interface StudyPatternsProps {
	weekly: WeeklyData | null;
}

export default function StudyPatterns({ weekly }: StudyPatternsProps) {
	const patterns = useMemo(() => {
		if (!weekly || !weekly.byDay) return null;

		const days = weekly.byDay.map(d => ({
			date: new Date(d.date),
			minutes: d.minutes,
			hours: d.minutes / 60
		}));

		// Calculate consistency
		const activeDays = days.filter(d => d.minutes > 0).length;
		const consistencyRate = days.length > 0 ? (activeDays / days.length) * 100 : 0;

		// Calculate average session length (assuming multiple sessions per day)
		const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
		const averageDailyMinutes = days.length > 0 ? totalMinutes / days.length : 0;

		// Find study streak
		let currentStreak = 0;
		let maxStreak = 0;
		days.forEach(day => {
			if (day.minutes > 0) {
				currentStreak++;
				maxStreak = Math.max(maxStreak, currentStreak);
			} else {
				currentStreak = 0;
			}
		});

		// Calculate variability
		const minutes = days.map(d => d.minutes);
		const mean = minutes.length > 0 ? minutes.reduce((a, b) => a + b, 0) / minutes.length : 0;
		const variance = minutes.length > 0 
			? minutes.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / minutes.length
			: 0;
		const stdDev = Math.sqrt(variance);
		const variability = mean > 0 ? (stdDev / mean) * 100 : 0;

		// Best time pattern (day of week)
		const dayOfWeekStats: Record<number, number> = {};
		days.forEach(day => {
			const dayOfWeek = day.date.getDay();
			dayOfWeekStats[dayOfWeek] = (dayOfWeekStats[dayOfWeek] || 0) + day.minutes;
		});
		const bestDayOfWeek = Object.entries(dayOfWeekStats || {})
			.sort(([, a], [, b]) => (b || 0) - (a || 0))[0]?.[0];
		const bestDayName = bestDayOfWeek !== undefined 
			? format(new Date(2024, 0, parseInt(bestDayOfWeek) + 1), 'EEEE', { locale: ar })
			: 'غير محدد';

		return {
			consistencyRate,
			averageDailyMinutes,
			maxStreak,
			variability,
			bestDayOfWeek: bestDayName,
			totalMinutes,
			activeDays
		};
	}, [weekly]);

	if (!patterns) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center py-8 text-muted-foreground">
						<Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>لا توجد بيانات لتحليل الأنماط</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const patternCards = [
		{
			title: "معدل الانتظام",
			value: patterns.consistencyRate,
			icon: Target,
			color: "from-blue-500 to-blue-600",
			bgColor: "bg-blue-50 dark:bg-blue-950/20",
			borderColor: "border-blue-200 dark:border-blue-800",
			unit: "%",
			description: `${patterns.activeDays} من ${weekly?.byDay.length || 7} أيام نشطة`
		},
		{
			title: "أطول سلسلة",
			value: patterns.maxStreak,
			icon: TrendingUp,
			color: "from-green-500 to-green-600",
			bgColor: "bg-green-50 dark:bg-green-950/20",
			borderColor: "border-green-200 dark:border-green-800",
			unit: " يوم",
			description: "أيام متتالية من المذاكرة"
		},
		{
			title: "متوسط يومي",
			value: (patterns.averageDailyMinutes / 60).toFixed(1),
			icon: Clock,
			color: "from-purple-500 to-purple-600",
			bgColor: "bg-purple-50 dark:bg-purple-950/20",
			borderColor: "border-purple-200 dark:border-purple-800",
			unit: " ساعة",
			description: "متوسط وقت المذاكرة اليومي"
		},
		{
			title: "معدل التباين",
			value: patterns.variability.toFixed(1),
			icon: Activity,
			color: patterns.variability < 30 ? "from-green-500 to-green-600" : "from-orange-500 to-orange-600",
			bgColor: patterns.variability < 30 ? "bg-green-50 dark:bg-green-950/20" : "bg-orange-50 dark:bg-orange-950/20",
			borderColor: patterns.variability < 30 ? "border-green-200 dark:border-green-800" : "border-orange-200 dark:border-orange-800",
			unit: "%",
			description: patterns.variability < 30 ? "أنماط منتظمة" : "أنماط متغيرة"
		}
	];

	return (
		<div className="space-y-6">
			{/* Pattern Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{patternCards.map((card, index) => {
					const Icon = card.icon;
					return (
						<Card 
							key={index}
							className={`${card.bgColor} ${card.borderColor} border-2 hover:shadow-lg transition-all duration-300`}
						>
							<CardContent className="p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex-1">
										<p className="text-sm font-medium text-muted-foreground mb-1">
											{card.title}
										</p>
										<p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
											{card.value}{card.unit}
										</p>
										<p className="text-xs text-muted-foreground">
											{card.description}
										</p>
									</div>
									<div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
										<Icon className="h-6 w-6 text-white" />
									</div>
								</div>
								{card.title === "معدل الانتظام" && (
									<Progress value={patterns.consistencyRate} className="h-2 mt-4" />
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Pattern Analysis */}
			<Card className="border-2 border-primary/20 shadow-lg">
				<CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
					<CardTitle className="flex items-center gap-2">
						<Brain className="h-5 w-5 text-primary" />
						تحليل الأنماط الدراسية
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-4">
							<h3 className="font-semibold text-lg flex items-center gap-2">
								<Calendar className="h-5 w-5 text-primary" />
								أفضل يوم للمذاكرة
							</h3>
							<div className="p-4 rounded-lg bg-muted/50">
								<p className="text-2xl font-bold mb-2">{patterns.bestDayOfWeek}</p>
								<p className="text-sm text-muted-foreground">
									بناءً على تحليل أنماط مذاكرتك
								</p>
							</div>
						</div>
						<div className="space-y-4">
							<h3 className="font-semibold text-lg flex items-center gap-2">
								<Activity className="h-5 w-5 text-primary" />
								ملاحظات التحليل
							</h3>
							<div className="space-y-2">
								{patterns.consistencyRate >= 80 && (
									<div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
										<p className="text-sm font-medium text-green-800 dark:text-green-200">
											âœ“ أنت تحافظ على انتظام ممتاز في المذاكرة
										</p>
									</div>
								)}
								{patterns.maxStreak >= 7 && (
									<div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
										<p className="text-sm font-medium text-blue-800 dark:text-blue-200">
											âœ“ لديك سلسلة طويلة من المذاكرة المتتالية
										</p>
									</div>
								)}
								{patterns.variability < 30 && (
									<div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
										<p className="text-sm font-medium text-purple-800 dark:text-purple-200">
											âœ“ أنماط مذاكرتك منتظمة ومتسقة
										</p>
									</div>
								)}
								{patterns.consistencyRate < 50 && (
									<div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
										<p className="text-sm font-medium text-orange-800 dark:text-orange-200">
											⚠️ حاول زيادة عدد أيام المذاكرة لتحسين الانتظام
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}


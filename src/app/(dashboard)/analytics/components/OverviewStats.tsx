'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
	TrendingUp, 
	Clock, 
	Target, 
	Flame, 
	Zap, 
	BookOpen,
	ArrowUp,
	ArrowDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useIsMounted } from '@/lib/safe-client-utils';

type WeeklyData = { 
	bySubject: Record<string, number>; 
	byDay: { date: string | Date; minutes: number }[] 
};

type SummaryData = {
	totalMinutes: number;
	averageFocus: number;
	tasksCompleted: number;
	streakDays: number;
};

interface OverviewStatsProps {
	summary: SummaryData | null;
	weekly: WeeklyData | null;
}

export default function OverviewStats({ summary, weekly }: OverviewStatsProps) {
	const isMounted = useIsMounted();
	
	const calculateImprovement = () => {
		if (!summary) return 0;
		const hours = summary.totalMinutes / 60;
		return Math.min(100, Math.max(0, Math.round((hours % 100))));
	};

	const calculateDailyAverage = () => {
		if (!summary || !weekly?.byDay) return 0;
		const days = (weekly.byDay || []).filter(d => {
			const date = new Date(d.date);
			return date <= new Date();
		}).length || 7;
		return Math.round((summary.totalMinutes / days) / 60);
	};

	const totalStudyHours = summary ? summary.totalMinutes / 60 : 0;
	const weeklyTotal = weekly?.bySubject 
		? Object.values(weekly.bySubject).reduce((a, b) => a + (b || 0), 0) / 60 
		: 0;
	const improvement = calculateImprovement();
	const dailyAverage = calculateDailyAverage();
	const streakDays = summary?.streakDays || 0;
	const tasksCompleted = summary?.tasksCompleted || 0;
	const averageFocus = summary?.averageFocus || 0;

	const stats = [
		{
			title: "معدل التحسن",
			value: `${improvement}%`,
			icon: TrendingUp,
			color: "from-blue-500 to-blue-600",
			bgColor: "bg-blue-50 dark:bg-blue-950/20",
			borderColor: "border-blue-200 dark:border-blue-800",
			trend: improvement > 50 ? "up" : "down",
			description: "مؤشر تطورك التعليمي"
		},
		{
			title: "متوسط ساعات اليوم",
			value: `${dailyAverage}`,
			icon: Clock,
			color: "from-green-500 to-green-600",
			bgColor: "bg-green-50 dark:bg-green-950/20",
			borderColor: "border-green-200 dark:border-green-800",
			trend: dailyAverage >= 3 ? "up" : "down",
			description: "ساعات المذاكرة اليومية"
		},
		{
			title: "ساعات هذا الأسبوع",
			value: weeklyTotal.toFixed(1),
			icon: Target,
			color: "from-purple-500 to-purple-600",
			bgColor: "bg-purple-50 dark:bg-purple-950/20",
			borderColor: "border-purple-200 dark:border-purple-800",
			trend: weeklyTotal >= 20 ? "up" : "down",
			description: "إجمالي وقت المذاكرة"
		},
		{
			title: "سلسلة الأيام",
			value: streakDays,
			icon: Flame,
			color: "from-orange-500 to-orange-600",
			bgColor: "bg-orange-50 dark:bg-orange-950/20",
			borderColor: "border-orange-200 dark:border-orange-800",
			trend: streakDays >= 7 ? "up" : "down",
			description: "أيام متتالية من المذاكرة"
		},
		{
			title: "المهام المكتملة",
			value: tasksCompleted,
			icon: Zap,
			color: "from-indigo-500 to-indigo-600",
			bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
			borderColor: "border-indigo-200 dark:border-indigo-800",
			trend: tasksCompleted > 0 ? "up" : "stable",
			description: "إجمالي المهام المنتهية"
		},
		{
			title: "معدل التركيز",
			value: `${averageFocus}%`,
			icon: BookOpen,
			color: "from-pink-500 to-pink-600",
			bgColor: "bg-pink-50 dark:bg-pink-950/20",
			borderColor: "border-pink-200 dark:border-pink-800",
			trend: averageFocus >= 70 ? "up" : "down",
			description: "متوسط التركيز أثناء المذاكرة"
		}
	];

	return (
		<div className="space-y-6">
			{/* Main Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{stats.map((stat, index) => {
					const Icon = stat.icon;
					return (
						<Card 
							key={index}
							className={`${stat.bgColor} ${stat.borderColor} border-2 hover:shadow-lg transition-all duration-300`}
						>
							<CardContent className="p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex-1">
										<p className="text-sm font-medium text-muted-foreground mb-1">
											{stat.title}
										</p>
										<div className="flex items-baseline gap-2">
											<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
												{stat.value}
											</p>
											{stat.trend === "up" && (
												<ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
											)}
											{stat.trend === "down" && (
												<ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
											)}
										</div>
										<p className="text-xs text-muted-foreground mt-2">
											{stat.description}
										</p>
									</div>
									<div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
										<Icon className="h-6 w-6 text-white" />
									</div>
								</div>
								{stat.title === "معدل التركيز" && (
									<Progress value={averageFocus} className="h-2 mt-4" />
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Summary Card */}
			<Card className="border-2 border-primary/20 shadow-lg">
				<CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
					<CardTitle className="flex items-center gap-2">
						<Target className="h-5 w-5 text-primary" />
						ملخص الأداء الشامل
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">إجمالي ساعات المذاكرة</p>
							<p className="text-2xl font-bold">{totalStudyHours.toFixed(1)} ساعة</p>
							<p className="text-xs text-muted-foreground">
								الهدف: 20 ساعة/أسبوع
							</p>
							<Progress 
								value={Math.min(100, (totalStudyHours / 20) * 100)} 
								className="h-2 mt-2"
							/>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">معدل الإنجاز</p>
							<p className="text-2xl font-bold">
								{summary ? Math.round((tasksCompleted / (tasksCompleted + 10)) * 100) : 0}%
							</p>
							<p className="text-xs text-muted-foreground">
								من إجمالي المهام
							</p>
							<Progress 
								value={summary ? Math.round((tasksCompleted / (tasksCompleted + 10)) * 100) : 0} 
								className="h-2 mt-2"
							/>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">التقدم الأسبوعي</p>
							<p className="text-2xl font-bold">{weeklyTotal.toFixed(1)} ساعة</p>
							<p className="text-xs text-muted-foreground">
								{isMounted ? `من ${format(new Date(), 'EEEE', { locale: ar })} الماضي` : 'من الأسبوع الماضي'}
							</p>
							<Progress 
								value={Math.min(100, (weeklyTotal / 20) * 100)} 
								className="h-2 mt-2"
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}


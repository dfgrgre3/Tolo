'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, TrendingDown, Activity, Zap, Award } from 'lucide-react';
import { useMemo } from "react";
import {
  calcCoreScores,
  getScoreColor,
  getScoreLabel,
  weekOverWeekChange,
} from "@/features/analytics/lib/performance-calculations";
import type {
  PerformanceRaw,
  SummaryData,
  WeeklyData,
} from "@/features/analytics/lib/types";

interface PerformanceMetricsProps {
	summary: SummaryData | null;
	weekly: WeeklyData | null;
	performanceMetrics: PerformanceRaw | null;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
	summary,
	weekly,
	performanceMetrics
}) => {
	const metrics = useMemo(
		() => calcCoreScores(summary, weekly, performanceMetrics),
		[summary, weekly, performanceMetrics],
	);
	const wow = useMemo(
		() => weekOverWeekChange(weekly, performanceMetrics),
		[weekly, performanceMetrics],
	);

	const performanceCards = [
		{
			title: "درجة الإنتاجية",
			value: metrics.productivityScore,
			icon: Zap,
			color: "from-blue-500 to-blue-600",
			bgColor: "bg-blue-50 dark:bg-blue-950/20",
			borderColor: "border-blue-200 dark:border-blue-800",
			description: "مقياس أدائك الإجمالي"
		},
		{
			title: "درجة الانتظام",
			value: metrics.consistencyScore,
			icon: Target,
			color: "from-green-500 to-green-600",
			bgColor: "bg-green-50 dark:bg-green-950/20",
			borderColor: "border-green-200 dark:border-green-800",
			description: "معدل المذاكرة المنتظمة"
		},
		{
			title: "درجة المشاركة",
			value: metrics.engagementScore,
			icon: Activity,
			color: "from-purple-500 to-purple-600",
			bgColor: "bg-purple-50 dark:bg-purple-950/20",
			borderColor: "border-purple-200 dark:border-purple-800",
			description: "مستوى تفاعلك مع المحتوى"
		},
		{
			title: "معدل النمو",
			value: metrics.growthRate,
			icon: metrics.growthRate >= 0 ? TrendingUp : TrendingDown,
			color: metrics.growthRate >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600",
			bgColor: metrics.growthRate >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20",
			borderColor: metrics.growthRate >= 0 ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800",
			description: "التطور في الأداء",
			isPercentage: true
		}
	];

	return (
		<div className="space-y-6">
			{/* Performance Score Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{performanceCards.map((card, index) => {
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
										<p className={`text-3xl font-bold ${getScoreColor(card.value)} mb-1`}>
											{card.value}{card.isPercentage ? '%' : ''}
										</p>
										<p className="text-xs text-muted-foreground">
											{card.description}
										</p>
									</div>
									<div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
										<Icon className="h-6 w-6 text-white" />
									</div>
								</div>
								{!card.isPercentage && (
									<>
										<Progress value={card.value} className="h-2 mt-4" />
										<p className="text-xs text-muted-foreground mt-2 text-center">
											{getScoreLabel(card.value)}
										</p>
									</>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Overall Performance Summary */}
			<Card className="border-2 border-primary/20 shadow-lg">
				<CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
					<CardTitle className="flex items-center gap-2">
						<Award className="h-5 w-5 text-primary" />
						ملخص الأداء الشامل
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">متوسط الأداء</p>
							<p className={`text-3xl font-bold ${getScoreColor(metrics.averageScore)}`}>
								{metrics.averageScore}%
							</p>
							<Progress
								value={metrics.averageScore}
								className="h-3 mt-2"
							/>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">الاتجاه</p>
							<div className="flex items-center gap-2">
								{metrics.growthRate >= 0 ? (
									<>
										<TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
										<p className="text-2xl font-bold text-green-600 dark:text-green-400">
											تحسن
										</p>
									</>
								) : (
									<>
										<TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
										<p className="text-2xl font-bold text-red-600 dark:text-red-400">
											تراجع
										</p>
									</>
								)}
							</div>
							<p className="text-xs text-muted-foreground">
								{wow !== null
									? `تغير أسبوعي: ${wow >= 0 ? "+" : ""}${wow}%`
									: metrics.growthRate >= 0 ? 'أداؤك في تحسن مستمر' : 'يحتاج إلى تحسين'}
							</p>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">التوصية</p>
							<p className="text-lg font-semibold">
								{metrics.productivityScore >= 80 
									? 'استمر في الأداء الممتاز'
									: metrics.productivityScore >= 60
									? 'أنت على الطريق الصحيح'
									: 'ركز على زيادة وقت المذاكرة'
								}
							</p>
							<p className="text-xs text-muted-foreground">
								بناءً على تحليل أدائك
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default PerformanceMetrics;
















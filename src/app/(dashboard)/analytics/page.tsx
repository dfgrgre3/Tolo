"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
	BarChart3, 
	TrendingUp, 
	TrendingDown, 
	Clock, 
	Target, 
	Calendar, 
	Zap, 
	Brain,
	RefreshCw,
	Download,
	Filter,
	Activity,
	Award,
	BookOpen,
	ArrowUp,
	ArrowDown
} from 'lucide-react';
import { ensureUser } from "@/lib/user-utils";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const LoadingFallback = () => (
  <div className="w-full h-64 bg-card/20 animate-pulse rounded-[2rem] border border-white/5 flex items-center justify-center">
    <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
  </div>
);

const OverviewStats = dynamic(() => import("./components/OverviewStats"), { loading: () => <LoadingFallback /> });
const WeeklyChart = dynamic(() => import("./components/WeeklyChart"), { loading: () => <LoadingFallback /> });
const PerformanceMetrics = dynamic(() => import("./components/PerformanceMetrics"), { loading: () => <LoadingFallback /> });
const PredictionsSection = dynamic(() => import("./components/PredictionsSection"), { loading: () => <LoadingFallback /> });
const SubjectDistribution = dynamic(() => import("./components/SubjectDistribution"), { loading: () => <LoadingFallback /> });
const TimeTrends = dynamic(() => import("./components/TimeTrends"), { loading: () => <LoadingFallback /> });
const StudyPatterns = dynamic(() => import("./components/StudyPatterns"), { loading: () => <LoadingFallback /> });

import { logger } from '@/lib/logger';

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

type PredictionsData = {
	period: string;
	predictedScore: number;
	confidence: number;
	milestones: Array<{ date: string; goal: string; status: string }>;
	recommendations: string[];
};

function AnalyticsPage() {
	const [activeTab, setActiveTab] = useState("overview");
	const [isLoading, setIsLoading] = useState(true);
	const [summary, setSummary] = useState<SummaryData | null>(null);
	const [weekly, setWeekly] = useState<WeeklyData | null>(null);
	const [predictions, setPredictions] = useState<PredictionsData[]>([]);
	const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, unknown> | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		try {
			setIsLoading(true);
			setError(null);
			const userId = await ensureUser();
			
			// Fetch all data in parallel
			const [summaryRes, weeklyRes, predictionsRes, performanceRes] = await Promise.all([
				fetch(`/api/progress/summary?userId=${userId}`).catch(() => null),
				fetch(`/api/analytics/weekly?userId=${userId}`).catch(() => null),
				fetch(`/api/analytics/predictions?userId=${userId}`).catch(() => null),
				fetch(`/api/analytics/performance?hours=168`).catch(() => null)
			]);

			if (summaryRes?.ok) {
				try {
					const summaryData = await summaryRes.json();
					setSummary(summaryData);
				} catch (e) {
					logger.error('Error parsing summary data:', e);
				}
			}

			if (weeklyRes?.ok) {
				try {
					const weeklyData = await weeklyRes.json();
					setWeekly(weeklyData);
				} catch (e) {
					logger.error('Error parsing weekly data:', e);
				}
			}

			if (predictionsRes?.ok) {
				try {
					const predictionsData = await predictionsRes.json();
					if (predictionsData.success) {
						setPredictions(predictionsData.predictions || []);
					}
				} catch (e) {
					logger.error('Error parsing predictions data:', e);
				}
			}

			if (performanceRes?.ok) {
				try {
					const performanceData = await performanceRes.json();
					setPerformanceMetrics(performanceData);
				} catch (e) {
					logger.error('Error parsing performance data:', e);
				}
			}
		} catch (err: unknown) {
			logger.error('Error fetching analytics:', err);
			const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل البيانات';
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const handleExport = () => {
		// Export analytics data as JSON
		const exportData = {
			summary,
			weekly,
			predictions,
			performanceMetrics,
			exportedAt: new Date().toISOString()
		};
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	if (isLoading) {
		return (
			<PageContainer size="xl" spacing="lg">
				<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
					<RefreshCw className="h-8 w-8 animate-spin text-primary" />
					<p className="text-lg font-semibold">جاري تحميل التحليلات...</p>
					<p className="text-sm text-muted-foreground">يرجى الانتظار</p>
				</div>
			</PageContainer>
		);
	}

	if (error) {
		return (
			<PageContainer size="xl" spacing="lg">
				<Card className="border-red-200 dark:border-red-800">
					<CardContent className="p-6">
						<div className="flex flex-col items-center justify-center space-y-4 text-center">
							<div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
								<Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<h3 className="text-lg font-semibold mb-2">حدث خطأ</h3>
								<p className="text-sm text-muted-foreground mb-4">{error}</p>
								<Button onClick={fetchData} variant="outline">
									<RefreshCw className="h-4 w-4 ml-2" />
									إعادة المحاولة
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</PageContainer>
		);
	}

	return (
		<PageContainer size="xl" spacing="lg">
			{/* Header */}
			<div className="mb-8 text-center">
				<div className="flex items-center justify-center gap-3 mb-4">
					<div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg">
						<BarChart3 className="h-8 w-8 text-white" />
					</div>
					<h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
						التحليلات والإحصائيات
					</h1>
				</div>
				<p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
					تابع أداءك التعليمي وتطورك مع تحليلات شاملة ومفصلة
				</p>
				<div className="flex items-center justify-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={fetchData}
						className="flex items-center gap-2"
					>
						<RefreshCw className="h-4 w-4" />
						تحديث البيانات
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						className="flex items-center gap-2"
					>
						<Download className="h-4 w-4" />
						تصدير البيانات
					</Button>
				</div>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
					<TabsTrigger value="overview" className="flex items-center gap-2">
						<Activity className="h-4 w-4" />
						<span className="hidden sm:inline">نظرة عامة</span>
					</TabsTrigger>
					<TabsTrigger value="weekly" className="flex items-center gap-2">
						<Calendar className="h-4 w-4" />
						<span className="hidden sm:inline">الأسبوعي</span>
					</TabsTrigger>
					<TabsTrigger value="performance" className="flex items-center gap-2">
						<Target className="h-4 w-4" />
						<span className="hidden sm:inline">الأداء</span>
					</TabsTrigger>
					<TabsTrigger value="subjects" className="flex items-center gap-2">
						<BookOpen className="h-4 w-4" />
						<span className="hidden sm:inline">المواد</span>
					</TabsTrigger>
					<TabsTrigger value="trends" className="flex items-center gap-2">
						<TrendingUp className="h-4 w-4" />
						<span className="hidden sm:inline">الاتجاهات</span>
					</TabsTrigger>
					<TabsTrigger value="patterns" className="flex items-center gap-2">
						<Brain className="h-4 w-4" />
						<span className="hidden sm:inline">الأنماط</span>
					</TabsTrigger>
					<TabsTrigger value="predictions" className="flex items-center gap-2">
						<Zap className="h-4 w-4" />
						<span className="hidden sm:inline">التنبؤات</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-6">
					<OverviewStats summary={summary} weekly={weekly} />
				</TabsContent>

				<TabsContent value="weekly" className="space-y-6">
					<WeeklyChart weekly={weekly} />
				</TabsContent>

				<TabsContent value="performance" className="space-y-6">
					<PerformanceMetrics 
						summary={summary} 
						weekly={weekly}
						performanceMetrics={performanceMetrics}
					/>
				</TabsContent>

				<TabsContent value="subjects" className="space-y-6">
					<SubjectDistribution weekly={weekly} />
				</TabsContent>

				<TabsContent value="trends" className="space-y-6">
					<TimeTrends weekly={weekly} />
				</TabsContent>

				<TabsContent value="patterns" className="space-y-6">
					<StudyPatterns weekly={weekly} />
				</TabsContent>

				<TabsContent value="predictions" className="space-y-6">
					<PredictionsSection predictions={predictions} />
				</TabsContent>
			</Tabs>
		</PageContainer>
	);
}

// Wrap with AuthGuard
const AnalyticsPageWithAuth = () => {
	return (
					<AnalyticsPage />
			);
};

export default AnalyticsPageWithAuth;

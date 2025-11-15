'use client';

import { useMemo } from 'react';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	Title,
	ArcElement
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useIsMounted } from '@/lib/safe-client-utils';

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	Title,
	ArcElement
);

type WeeklyData = { 
	bySubject: Record<string, number>; 
	byDay: { date: string | Date; minutes: number }[] 
};

interface WeeklyChartProps {
	weekly: WeeklyData | null;
}

export default function WeeklyChart({ weekly }: WeeklyChartProps) {
	const isMounted = useIsMounted();
	
	const chartData = useMemo(() => {
		if (!weekly) return null;

		const subjectLabels = Object.keys(weekly.bySubject);
		const subjectData = Object.values(weekly.bySubject);
		
		// استخدام تنسيق آمن للتاريخ - نفس التنسيق على الخادم والعميل لتجنب مشاكل Hydration
		const dayLabels = weekly.byDay.map((d) => {
			const date = new Date(d.date);
			// استخدام نفس التنسيق دائماً لضمان التوافق
			return format(date, 'EEEE', { locale: ar });
		});
		const dayData = weekly.byDay.map((d) => d.minutes);

		return {
			subjects: {
				labels: subjectLabels,
				data: subjectData
			},
			days: {
				labels: dayLabels,
				data: dayData
			}
		};
	}, [weekly]);

	if (!weekly || !chartData) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center py-8 text-muted-foreground">
						<Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>لا توجد بيانات أسبوعية متاحة</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const subjectChartData = {
		labels: chartData.subjects.labels,
		datasets: [{
			label: "دقائق",
			data: chartData.subjects.data,
			backgroundColor: [
				'rgba(59, 130, 246, 0.8)',
				'rgba(16, 185, 129, 0.8)',
				'rgba(245, 158, 11, 0.8)',
				'rgba(239, 68, 68, 0.8)',
				'rgba(139, 92, 246, 0.8)',
				'rgba(236, 72, 153, 0.8)',
			],
			borderColor: [
				'rgba(59, 130, 246, 1)',
				'rgba(16, 185, 129, 1)',
				'rgba(245, 158, 11, 1)',
				'rgba(239, 68, 68, 1)',
				'rgba(139, 92, 246, 1)',
				'rgba(236, 72, 153, 1)',
			],
			borderWidth: 2,
			borderRadius: 8
		}]
	};

	const dayChartData = {
		labels: chartData.days.labels,
		datasets: [{
			label: "دقائق",
			data: chartData.days.data,
			borderColor: 'rgb(16, 185, 129)',
			backgroundColor: 'rgba(16, 185, 129, 0.3)',
			borderWidth: 3,
			fill: true,
			tension: 0.4,
			pointRadius: 6,
			pointHoverRadius: 8,
			pointBackgroundColor: 'rgb(16, 185, 129)',
			pointBorderColor: '#fff',
			pointBorderWidth: 2
		}]
	};

	const totalMinutes = chartData.days.data.reduce((a, b) => a + b, 0);
	const totalHours = (totalMinutes / 60).toFixed(1);
	const averageMinutes = chartData.days.data.length > 0 
		? Math.round(totalMinutes / chartData.days.data.length)
		: 0;
	const maxDayIndex = chartData.days.data.length > 0
		? chartData.days.data.indexOf(Math.max(...chartData.days.data))
		: -1;
	// استخدام تنسيق آمن للتاريخ - نفس التنسيق المستخدم في labels
	const bestDay = maxDayIndex >= 0 && chartData.days.labels[maxDayIndex] 
		? chartData.days.labels[maxDayIndex] 
		: '';

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="border-blue-200 dark:border-blue-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الوقت</p>
								<p className="text-2xl font-bold">{totalHours} ساعة</p>
							</div>
							<Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-green-200 dark:border-green-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">المتوسط اليومي</p>
								<p className="text-2xl font-bold">{averageMinutes} دقيقة</p>
							</div>
							<TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-purple-200 dark:border-purple-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">أفضل يوم</p>
								<p className="text-2xl font-bold">{bestDay}</p>
							</div>
							<Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Subject Distribution Chart */}
			{chartData.subjects.labels.length > 0 && isMounted && (
				<Card>
					<CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
						<CardTitle className="flex items-center gap-2">
							<Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							توزيع وقت المذاكرة حسب المادة
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						<div className="h-80">
							<Bar
								data={subjectChartData}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									plugins: {
										legend: {
											display: false
										},
										tooltip: {
											callbacks: {
												label: (context) => {
													const minutes = context.parsed.y ?? 0;
													const hours = (minutes / 60).toFixed(1);
													return `${minutes} دقيقة (${hours} ساعة)`;
												}
											}
										}
									},
									scales: {
										y: {
											beginAtZero: true,
											ticks: {
												callback: function(value) {
													return value + ' د';
												}
											}
										}
									}
								}}
							/>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Daily Trend Chart */}
			{chartData.days.labels.length > 0 && isMounted && (
				<Card>
					<CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
							اتجاه وقت المذاكرة خلال الأسبوع
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						<div className="h-80">
							<Line
								data={dayChartData}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									plugins: {
										legend: {
											display: false
										},
										tooltip: {
											callbacks: {
												label: (context) => {
													const minutes = context.parsed.y ?? 0;
													const hours = (minutes / 60).toFixed(1);
													return `${minutes} دقيقة (${hours} ساعة)`;
												}
											}
										}
									},
									scales: {
										y: {
											beginAtZero: true,
											ticks: {
												callback: function(value) {
													return value + ' د';
												}
											}
										}
									}
								}}
							/>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}


'use client';

import { useMemo } from 'react';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	ArcElement,
	Tooltip,
	Legend
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, TrendingUp, Award } from 'lucide-react';

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	ArcElement,
	Tooltip,
	Legend
);

type WeeklyData = { 
	bySubject: Record<string, number>; 
	byDay: { date: string | Date; minutes: number }[] 
};

interface SubjectDistributionProps {
	weekly: WeeklyData | null;
}

export default function SubjectDistribution({ weekly }: SubjectDistributionProps) {
	const subjectData = useMemo(() => {
		if (!weekly || !weekly.bySubject) return null;

		const subjects = Object.entries(weekly.bySubject || {})
			.map(([name, minutes]) => ({
				name,
				minutes: minutes || 0,
				hours: (minutes || 0) / 60,
				percentage: 0
			}))
			.sort((a, b) => b.minutes - a.minutes);

		const totalMinutes = subjects.reduce((sum, s) => sum + s.minutes, 0);
		
		subjects.forEach(subject => {
			subject.percentage = totalMinutes > 0 
				? Math.round((subject.minutes / totalMinutes) * 100) 
				: 0;
		});

		return { subjects, totalMinutes, totalHours: totalMinutes / 60 };
	}, [weekly]);

	if (!subjectData || subjectData.subjects.length === 0) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center py-8 text-muted-foreground">
						<BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>لا توجد بيانات للمواد الدراسية</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const colors = [
		'rgba(59, 130, 246, 0.8)',
		'rgba(16, 185, 129, 0.8)',
		'rgba(245, 158, 11, 0.8)',
		'rgba(239, 68, 68, 0.8)',
		'rgba(139, 92, 246, 0.8)',
		'rgba(236, 72, 153, 0.8)',
		'rgba(34, 197, 94, 0.8)',
		'rgba(59, 130, 246, 0.8)',
	];

	const barChartData = {
		labels: subjectData.subjects.map(s => s.name),
		datasets: [{
			label: "ساعات",
			data: subjectData.subjects.map(s => s.hours),
			backgroundColor: colors.slice(0, subjectData.subjects.length),
			borderColor: colors.slice(0, subjectData.subjects.length).map(c => c.replace('0.8', '1')),
			borderWidth: 2,
			borderRadius: 8
		}]
	};

	const doughnutChartData = {
		labels: subjectData.subjects.map(s => s.name),
		datasets: [{
			data: subjectData.subjects.map(s => s.minutes),
			backgroundColor: colors.slice(0, subjectData.subjects.length),
			borderColor: '#fff',
			borderWidth: 2
		}]
	};

	const topSubject = subjectData.subjects[0];

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="border-blue-200 dark:border-blue-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">إجمالي المواد</p>
								<p className="text-2xl font-bold">{subjectData.subjects.length}</p>
							</div>
							<BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-green-200 dark:border-green-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الوقت</p>
								<p className="text-2xl font-bold">{subjectData.totalHours.toFixed(1)} ساعة</p>
							</div>
							<TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-purple-200 dark:border-purple-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">المادة الأكثر</p>
								<p className="text-2xl font-bold">{topSubject?.name || '-'}</p>
							</div>
							<Award className="h-8 w-8 text-purple-600 dark:text-purple-400" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Bar Chart */}
				<Card>
					<CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
						<CardTitle className="flex items-center gap-2">
							<BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							توزيع الوقت حسب المادة (عمودي)
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						<div className="h-80">
							<Bar
								data={barChartData}
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
													const hours = context.parsed.y ?? 0;
													const minutes = hours * 60;
													return `${hours.toFixed(1)} ساعة (${Math.round(minutes)} دقيقة)`;
												}
											}
										}
									},
									scales: {
										y: {
											beginAtZero: true,
											ticks: {
												callback: function(value) {
													return value + ' س';
												}
											}
										}
									}
								}}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Doughnut Chart */}
				<Card>
					<CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
						<CardTitle className="flex items-center gap-2">
							<Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
							نسبة التوزيع
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						<div className="h-80">
							<Doughnut
								data={doughnutChartData}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									plugins: {
										legend: {
											position: 'bottom',
											labels: {
												padding: 15,
												usePointStyle: true
											}
										},
										tooltip: {
											callbacks: {
												label: (context) => {
													const label = context.label || '';
													const value = context.parsed || 0;
													const hours = value / 60;
													const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
													const percentage = ((value / total) * 100).toFixed(1);
													return `${label}: ${hours.toFixed(1)} ساعة (${percentage}%)`;
												}
											}
										}
									}
								}}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Detailed List */}
			<Card>
				<CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
						تفاصيل المواد
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="space-y-4">
						{subjectData.subjects.map((subject, index) => (
							<div key={index} className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div 
											className="w-4 h-4 rounded-full"
											style={{ backgroundColor: colors[index % colors.length] }}
										/>
										<span className="font-medium">{subject.name}</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm text-muted-foreground">
											{subject.hours.toFixed(1)} ساعة
										</span>
										<span className="text-sm font-semibold text-primary w-12 text-left">
											{subject.percentage}%
										</span>
									</div>
								</div>
								<Progress value={subject.percentage} className="h-2" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}


"use client";

import { useEffect, useState } from "react";
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
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Title);

import { ensureUser } from "@/lib/user-utils";

type WeeklyData = { bySubject: Record<string, number>; byDay: { date: string | Date; minutes: number }[] };

export default function AnalyticsPage() {
	const [summary, setSummary] = useState<{ totalMinutes: number; averageFocus: number; tasksCompleted: number; streakDays: number } | null>(null);
	const [weekly, setWeekly] = useState<WeeklyData | null>(null);

	useEffect(() => {
		(async () => {
			const userId = await ensureUser();
			const sRes = await fetch(`/api/progress/summary?userId=${userId}`);
			setSummary(await sRes.json());
			const wRes = await fetch(`/api/analytics/weekly?userId=${userId}`);
			setWeekly(await wRes.json());
		})();
	}, []);

	const subjectLabels = weekly ? Object.keys(weekly.bySubject) : [];
	const subjectData = weekly ? Object.values(weekly.bySubject) : [];
	const dayLabels = weekly ? weekly.byDay.map((d) => new Date(d.date).toLocaleDateString("ar-EG", { weekday: "short" })) : [];
	const dayData = weekly ? weekly.byDay.map((d) => d.minutes) : [];

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">الإحصائيات والتحليلات</h1>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">معدل التحسن</p><p className="text-2xl font-bold">{summary ? Math.max(0, Math.round(((summary.totalMinutes / 60) % 100))) : 0}%</p></div>
					<div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">متوسط ساعات اليوم</p><p className="text-2xl font-bold">{summary ? Math.round((summary.totalMinutes / 7) / 60) : 0}</p></div>
					<div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">معدل الدرجات</p><p className="text-2xl font-bold">-</p></div>
				</div>
				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">دقائق هذا الأسبوع حسب المادة</h2>
					{weekly && subjectLabels.length > 0 ? (
						<Bar
							data={{ labels: subjectLabels, datasets: [{ label: "دقائق", data: subjectData, backgroundColor: "rgba(59,130,246,0.6)" }] }}
							options={{ responsive: true, plugins: { legend: { display: false }, title: { display: false, text: "" } } }}
						/>
					) : (
						<p className="text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
					)}
				</div>
				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">آخر 7 أيام</h2>
					{weekly && dayLabels.length > 0 ? (
						<Line
							data={{ labels: dayLabels, datasets: [{ label: "دقائق", data: dayData, borderColor: "rgb(16,185,129)", backgroundColor: "rgba(16,185,129,0.3)" }] }}
							options={{ responsive: true, plugins: { legend: { display: false } } }}
						/>
					) : (
						<p className="text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
					)}
				</div>
			</section>
		</div>
	);
} 
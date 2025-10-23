"use client";

import { useEffect, useState } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

const LOCAL_USER_KEY = "tw_user_id";

async function ensureUser(): Promise<string> {
	let id = localStorage.getItem(LOCAL_USER_KEY);
	if (!id) {
		const res = await fetch("/api/users/guest", { method: "POST" });
		const data = await res.json();
		id = data.id;
		localStorage.setItem(LOCAL_USER_KEY, id!);
	}
	return id!;
}

export default function ProgressPage() {
	const [summary, setSummary] = useState<{ totalMinutes: number; averageFocus: number; tasksCompleted: number; streakDays: number } | null>(null);
  // Using our new hook to safely manage the view preference
  const [viewMode, setViewMode] = useLocalStorageState<'chart' | 'list'>('progress-view-mode', 'chart');

	useEffect(() => {
		(async () => {
			const userId = await ensureUser();
			const res = await fetch(`/api/progress/summary?userId=${userId}`);
			const data = await res.json();
			setSummary(data);
		})();
	}, []);

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold">تتبع التقدم</h1>
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-1 rounded ${viewMode === 'chart' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setViewMode('chart')}
            >
              مخطط
            </button>
            <button 
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setViewMode('list')}
            >
              قائمة
            </button>
          </div>
        </div>
				<div className="grid gap-4 md:grid-cols-4">
					<div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">إجمالي الدقائق</p><p className="text-2xl font-bold">{summary?.totalMinutes ?? 0}</p></div>
					<div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">متوسط يومي</p><p className="text-2xl font-bold">{summary ? Math.round((summary.totalMinutes / 7)) : 0}</p></div>
					<div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">أيام متتالية</p><p className="text-2xl font-bold">{summary?.streakDays ?? 0}</p></div>
					<div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">معدل التركيز</p><p className="text-2xl font-bold">{summary?.averageFocus ?? 0}%</p></div>
				</div>
        {viewMode === 'chart' ? (
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">تقدم أسبوعي حسب المادة</h2>
            <p className="text-sm text-muted-foreground">سيتم عرض مخططات حقيقية بعد ربط تفاصيل الجلسات.</p>
          </div>
        ) : (
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">قائمة التقدم</h2>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>الرياضيات</span>
                <span>85%</span>
              </li>
              <li className="flex justify-between">
                <span>اللغة العربية</span>
                <span>78%</span>
              </li>
              <li className="flex justify-between">
                <span>الفيزياء</span>
                <span>92%</span>
              </li>
            </ul>
          </div>
        )}
			</section>
		</div>
	);
}
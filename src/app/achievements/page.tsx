
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ensureUser } from "@/lib/user-utils";

type Achievement = {
	id: string;
	key: string;
	title: string;
	description?: string;
	earnedAt: string;
};

export default function AchievementsPage() {
	const [achievements, setAchievements] = useState<Achievement[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			const userId = await ensureUser();
			const res = await fetch(`/api/achievements?userId=${userId}`);
			if (res.ok) {
				setAchievements(await res.json());
			}
			setLoading(false);
		})();
	}, []);

	return (
		<div className="px-4 py-8">
			<div className="mx-auto max-w-7xl">
				<h1 className="text-3xl font-bold mb-6">إنجازاتك</h1>

				{loading ? (
					<div className="flex justify-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
					</div>
				) : achievements.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-5xl mb-4">🏆</div>
						<h2 className="text-xl font-semibold mb-2">لم تحصل على أي إنجازات بعد</h2>
						<p className="text-muted-foreground mb-6">استمر في المذاكرة وإكمال المهام للحصول على إنجازات</p>
						<Link href="/tasks" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md">
							ابدأ المهام
						</Link>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{achievements.map((achievement) => (
							<div key={achievement.id} className="border rounded-lg p-4 flex flex-col">
								<div className="flex items-center mb-2">
									<div className="text-2xl mr-2">🏆</div>
									<h3 className="font-semibold">{achievement.title}</h3>
								</div>
								{achievement.description && (
									<p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
								)}
								<div className="mt-auto text-xs text-muted-foreground">
									تم الحصول عليها في: {new Date(achievement.earnedAt).toLocaleDateString('ar-SA')}
								</div>
							</div>
						))}
					</div>
				)}

				<div className="mt-12">
					<h2 className="text-xl font-semibold mb-4">كيفية الحصول على المزيد من الإنجازات</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="border rounded-lg p-4">
							<h3 className="font-medium mb-2">📚 إنجازات الدراسة</h3>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>• دراسة لمدة 10 ساعات</li>
								<li>• دراسة لمدة 50 ساعة</li>
								<li>• دراسة لمدة 100 ساعة</li>
								<li>• دراسة 7 أيام متتالية</li>
								<li>• دراسة 30 يوم متتالي</li>
							</ul>
						</div>
						<div className="border rounded-lg p-4">
							<h3 className="font-medium mb-2">✅ إنجازات المهام</h3>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>• إكمال 10 مهام</li>
								<li>• إكمال 50 مهمة</li>
								<li>• إكمال 100 مهمة</li>
								<li>• إكمال جميع مهام الأسبوع</li>
								<li>• إكمال مهام في جميع المواد</li>
							</ul>
						</div>
						<div className="border rounded-lg p-4">
							<h3 className="font-medium mb-2">📊 إنجازات الامتحانات</h3>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>• الحصول على 80% في امتحان</li>
								<li>• الحصول على 90% في امتحان</li>
								<li>• إكمال 5 امتحانات</li>
								<li>• إكمال امتحان في كل مادة</li>
								<li>• تحسين النتيجة بنسبة 20%</li>
							</ul>
						</div>
						<div className="border rounded-lg p-4">
							<h3 className="font-medium mb-2">⏱️ إنجازات الوقت</h3>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>• استخدام تقنية البومودورو 10 مرات</li>
								<li>• استخدام تقنية البومودورو 50 مرة</li>
								<li>• إكمال 5 جلسات دراسة عميقة</li>
								<li>• الالتزام بالجدول الأسبوعي</li>
								<li>• تحقيق أهداف أسبوعية 4 أسابيع متتالية</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

import Link from "next/link";

export function BlogSection() {
	return (
		<div className="mt-16">
			<h2 className="text-2xl font-bold mb-4 text-primary">📰 المدونة</h2>
			<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
				<div className="rounded-lg border p-4 bg-card shadow-sm">
					<h3 className="font-semibold mb-2">أفضل طرق المذاكرة الحديثة</h3>
					<p className="text-sm text-muted-foreground">تعرف على أحدث تقنيات تنظيم الوقت وزيادة الفهم.</p>
					<Link href="/tips" className="text-primary text-xs mt-2 inline-block hover:underline">اقرأ المزيد →</Link>
				</div>
				<div className="rounded-lg border p-4 bg-card shadow-sm">
					<h3 className="font-semibold mb-2">كيف تستفيد من الامتحانات التجريبية؟</h3>
					<p className="text-sm text-muted-foreground">طرق عملية للاستعداد للامتحانات وتحقيق نتائج أفضل.</p>
					<Link href="/exams" className="text-primary text-xs mt-2 inline-block hover:underline">اقرأ المزيد →</Link>
				</div>
			</div>
		</div>
	);
}

export default BlogSection;

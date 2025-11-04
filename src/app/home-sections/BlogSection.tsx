import Link from "next/link";
import { memo } from "react";

export const BlogSection = memo(function BlogSection() {
	return (
		<section className="mt-16" aria-labelledby="blog-heading">
			<h2 id="blog-heading" className="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
				<span>المدونة</span>
				<span className="text-xl" aria-hidden="true">📰</span>
			</h2>
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
		</section>
	);
});
BlogSection.displayName = "BlogSection";

export default BlogSection;

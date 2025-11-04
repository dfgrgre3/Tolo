import Link from "next/link";
import { memo } from "react";

export const TipsSection = memo(function TipsSection() {
	return (
		<section className="mt-4" aria-labelledby="tips-heading">
			<h2 id="tips-heading" className="text-xl md:text-2xl font-bold mb-4 text-primary flex items-center gap-2">
				<span>نصائح مفيدة</span>
				<span className="text-lg" aria-hidden="true">💡</span>
			</h2>
			<div className="grid gap-6 grid-cols-1 md:grid-cols-3">
				<div className="group rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between border border-blue-100">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
							<span className="text-xl">⏱️</span>
						</div>
						<h3 className="font-semibold text-lg text-blue-700">تقنية بومودورو</h3>
					</div>
					<p className="text-muted-foreground mb-4">ابدأ بجلسة 25 دقيقة ثم خذ 5 دقائق راحة. كرر 4 مرات مع راحة أطول بعد الدورة الرابعة.</p>
					<Link href="/time" className="w-full px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-center font-medium hover:bg-blue-100 transition-colors duration-300 inline-block">
						جرب الآن
					</Link>
				</div>
				<div className="group rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between border border-green-100">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
							<span className="text-xl">📅</span>
						</div>
						<h3 className="font-semibold text-lg text-green-700">الخطة الأسبوعية</h3>
					</div>
					<p className="text-muted-foreground mb-4">اختر جدولك، أضف دروسك، واحفظ الخطة. تنظيم الوقت هو مفتاح النجاح.</p>
					<Link href="/schedule" className="w-full px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg text-center font-medium hover:bg-green-100 transition-colors duration-300 inline-block">
						افتح الجدول
					</Link>
				</div>
				<div className="group rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between border border-purple-100">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
							<span className="text-xl">📊</span>
						</div>
						<h3 className="font-semibold text-lg text-purple-700">تتبع التقدم</h3>
					</div>
					<p className="text-muted-foreground mb-4">شاهد إحصائياتك وتقدمك الأسبوعي في الدراسة. القياس هو أول خطوة للتحسين.</p>
					<Link href="/progress" className="w-full px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-center font-medium hover:bg-purple-100 transition-colors duration-300 inline-block">
						عرض التقدم
					</Link>
				</div>
			</div>
		</section>
	);
});
TipsSection.displayName = "TipsSection";

export default TipsSection;

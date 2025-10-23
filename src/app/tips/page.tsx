export default function TipsPage() {
	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">نصائح دراسية متقدمة</h1>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="rounded-lg border p-4">
						<h2 className="font-semibold mb-2">المذاكرة الفعالة</h2>
						<ul className="text-sm text-muted-foreground list-disc pr-5 space-y-1">
							<li>تقنية الاسترجاع النشط: اختبر نفسك بعد كل فقرة.</li>
							<li>التكرار المتباعد: راجع بعد 1 يوم، 3 أيام، أسبوع.</li>
							<li>خلط المواضيع: بدّل بين المواد لتثبيت أفضل.</li>
						</ul>
					</div>
					<div className="rounded-lg border p-4">
						<h2 className="font-semibold mb-2">التحضير للامتحانات</h2>
						<ul className="text-sm text-muted-foreground list-disc pr-5 space-y-1">
							<li>حل نماذج السنوات السابقة تحت زمن محدد.</li>
							<li>صِغ ملخصات مركزة من 1-2 صفحة لكل درس.</li>
							<li>حل أخطاءك القديمة أولاً قبل محتوى جديد.</li>
						</ul>
					</div>
				</div>
				<div className="rounded-lg border p-4">
					<h2 className="font-semibold mb-2">نصائح حسب المادة</h2>
					<div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
						<div>
							<p className="font-medium text-foreground">الرياضيات</p>
							<p>حل مسائل متنوعة يوميًا وراجع القوانين بتلخيص بصري.</p>
						</div>
						<div>
							<p className="font-medium text-foreground">الفيزياء</p>
							<p>افهم المفاهيم ثم طبّقها بمحاكيات وتجارب افتراضية.</p>
						</div>
						<div>
							<p className="font-medium text-foreground">الكيمياء</p>
							<p>اربط المعادلات بالتطبيق العملي وجداول تفاعلية.</p>
						</div>
						<div>
							<p className="font-medium text-foreground">العربية والإنجليزية</p>
							<p>مفردات يومية، قراءة سريعة، وتدريب كتابة بإطار تصحيحي.</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
} 
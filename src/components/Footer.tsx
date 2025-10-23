export default function Footer() {
	return (
		<footer className="border-t bg-background">
			<div className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted-foreground flex flex-col md:flex-row gap-2 items-center justify-between">
				<p>© {new Date().getFullYear()} ثانوية بذكاء</p>
				<p>منصة تنظيم الوقت والنصائح والإحصائيات لثالثة ثانوي</p>
			</div>
		</footer>
	);
} 
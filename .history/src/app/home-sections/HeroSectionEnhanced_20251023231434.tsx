import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/shared/button";
import { Card, CardContent } from "@/shared/card";
import { Badge } from "@/shared/badgimport {
	Clock,
	Flame,
	CheckCircle2,
	Target,
	Zap,
	Play,
	BookOpen,
	Users,
	Brain,
	Award,
	ArrowRight,
	Sparkles,
	BarChart3,
	Trophy,
	LogIn,
	TrendingUp
} from "lucide-react";

export function HeroSectionEnhanced({
	summary,
	priority = false
}: {
	summary: { totalMinutes: number; averageFocus: number; tasksCompleted: number; streakDays: number } | null;
	priority?: boolean;
}) {
	// Keep the priority prop for backwards compatibility with layout optimization
	void priority;

	const formatNumber = (value: number) => new Intl.NumberFormat("ar-EG").format(value);

	const totalHours = summary ? Math.max(0, Math.round(summary.totalMinutes / 60)) : 0;
	const streakDays = summary?.streakDays ?? 0;
	const tasksCompleted = summary?.tasksCompleted ?? 0;
	const focusAverage = summary?.averageFocus ?? 0;

	const quickStats = [
		{
			label: "ساعات المذاكرة المسجلة",
			value: formatNumber(totalHours),
			suffix: totalHours ? "ساعة" : "",
			description: "إجمالي وقت الدراسة خلال هذا الأسبوع."
		},
		{
			label: "نسبة الالتزام",
			value: `${focusAverage}%`,
			description: "متوسط تركيزك في الجلسات المسجلة."
		},
		{
			label: "المهام المنجزة",
			value: formatNumber(tasksCompleted),
			suffix: tasksCompleted ? "مهمة" : "",
			description: "عدد المهام التي أتممتها بنجاح."
		},
		{
			label: "سلسلة الإنجاز",
			value: formatNumber(streakDays),
			suffix: streakDays ? "يوم" : "",
			description: "أيام الاستمرارية المتتالية بدون انقطاع."
		}
	];

	const heroHighlights = [
		"خطط دراسية مرنة تُبنى تلقائيًا حسب جدولك.",
		"لوحات تحليلات دقيقة لكل مادة وهدف.",
		"تنبيهات ذكية تُحافظ على استمراريتك يومًا بيوم."
	];

	const miniFeatures = [
		{
			icon: <BookOpen className="h-6 w-6 text-blue-600" />,
			title: "بنك دروس متجدد",
			description: "ملخصات، مقاطع تفاعلية، واختبارات قصيرة لكل باب."
		},
		{
			icon: <Users className="h-6 w-6 text-purple-600" />,
			title: "مجتمع دراسة نشط",
			description: "انضم إلى مجموعات تركز على نفس الأهداف والامتحانات."
		},
		{
			icon: <Brain className="h-6 w-6 text-amber-600" />,
			title: "تحليلات ذكية",
			description: "قرارات مدعومة بالبيانات تساعدك على تحسين روتينك."
		},
		{
			icon: <Trophy className="h-6 w-6 text-emerald-600" />,
			title: "لوحة إنجازات محفزة",
			description: "اجمع الأوسمة واحتفل بالتقدم في كل مادة."
		}
	];

	return (
		<div dir="rtl" className="relative flex flex-col gap-12">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
			>
				<div className="grid items-start gap-10 lg:grid-cols-[1.2fr_minmax(0,0.9fr)]">
					<div className="space-y-6 text-right">
						<div className="flex flex-wrap items-center justify-end gap-3">
							<Badge className="flex items-center gap-2 border-0 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-700">
								<Sparkles className="h-3 w-3" />
								منصة thanawy الذكية
							</Badge>
							<span className="text-sm font-medium text-blue-600/70">حل متكامل لتنظيم يوم طالب الثانوية العامة</span>
						</div>

						<h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
							ابنِ خطتك الدراسية بثقة ووضوح
						</h1>
						<p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
							توفر thanawy مزيجًا ذكيًا من إدارة المهام، الجداول المرنة، والتحليلات اللحظية حتى تبقى دائمًا مستعدًا
							للامتحان التالي.
						</p>

						<ul className="flex flex-col gap-3 text-base text-slate-600">
							{heroHighlights.map((item) => (
								<li key={item} className="flex flex-row-reverse items-center justify-start gap-3">
									<span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
										<CheckCircle2 className="h-4 w-4" />
									</span>
									<span>{item}</span>
								</li>
							))}
						</ul>

						<div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-start sm:gap-4">
							<Link href="/getting-started">
								<Button className="flex items-center gap-2 rounded-full bg-gradient-to-l from-purple-600 to-blue-600 px-12 py-6 text-lg font-semibold shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl">
									ابدأ رحلة التفوق الآن
									<ArrowRight className="h-5 w-5" />
								</Button>
							</Link>
							<Link href="/demo">
								<Button
									variant="outline"
									className="flex items-center gap-2 rounded-full border-2 border-blue-200 px-10 py-5 text-lg text-blue-600 hover:bg-blue-50"
								>
									<Play className="h-5 w-5" />
									جولة تفاعلية سريعة
								</Button>
							</Link>
							<Link
								href="/login"
								className="flex items-center justify-end gap-2 text-sm font-medium text-blue-700 transition-colors hover:text-blue-800"
							>
								<LogIn className="h-4 w-4" />
								تسجيل الدخول للطلاب
							</Link>
						</div>
					</div>

					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2, duration: 0.7 }}
						className="relative"
					>
						<div className="absolute -right-6 -top-10 h-40 w-40 rounded-full bg-blue-300/30 blur-3xl" />
						<div className="absolute -left-10 -bottom-12 h-48 w-48 rounded-full bg-purple-300/25 blur-3xl" />

						<div className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-white/90 p-6 shadow-2xl backdrop-blur">
							<div className="flex items-center justify-between">
								<span className="flex items-center gap-2 text-sm font-semibold text-blue-600">
									<TrendingUp className="h-4 w-4" />
									لوحة التقدم الفوري
								</span>
								<Badge variant="secondary" className="border-0 bg-blue-600/10 text-xs text-blue-700">
									مباشر
								</Badge>
							</div>

							<div className="mt-6 grid gap-4 sm:grid-cols-2">
								{quickStats.map((stat) => (
									<div
										key={stat.label}
										className="flex flex-col gap-2 rounded-2xl border border-slate-100/70 bg-white/95 p-4 text-right shadow-sm"
									>
										<span className="text-xs font-medium text-slate-500">{stat.label}</span>
										<div className="flex flex-row-reverse items-end justify-start gap-1 text-slate-900">
											<span className="text-3xl font-bold">{stat.value}</span>
											{stat.suffix && <span className="text-sm text-muted-foreground">{stat.suffix}</span>}
										</div>
										<span className="text-xs text-muted-foreground">{stat.description}</span>
									</div>
								))}
							</div>

							<div className="mt-6 rounded-2xl bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 p-5 text-right text-white shadow-lg">
								<p className="text-sm text-white/70">نصيحة اليوم</p>
								<p className="mt-2 text-base font-medium leading-relaxed">
									خصص 45 دقيقة لمراجعة أهم النقاط التي واجهتك هذا الأسبوع، وأضفها كمهمة مميزة في لوحة المتابعة.
								</p>
							</div>
						</div>
					</motion.div>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.6 }}
			>
				<div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-3xl border border-blue-100 bg-white/85 p-6 text-center shadow-lg backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 shadow-sm">
							<Clock className="h-8 w-8 text-blue-600" />
						</div>
						<p className="mb-2 text-sm text-muted-foreground">إجمالي وقت الدراسة</p>
						<p className="text-4xl font-bold text-slate-900">{formatNumber(totalHours)}</p>
						<span className="text-sm text-muted-foreground">ساعة مسجلة خلال الأسبوع الحالي</span>
					</div>

					<div className="rounded-3xl border border-emerald-100 bg-white/85 p-6 text-center shadow-lg backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-sm">
							<Flame className="h-8 w-8 text-emerald-600" />
						</div>
						<p className="mb-2 text-sm text-muted-foreground">سلسلة الإنجاز المتتالية</p>
						<p className="text-4xl font-bold text-slate-900">{formatNumber(streakDays)}</p>
						<span className="text-sm text-muted-foreground">يومًا من الاستمرارية دون انقطاع</span>
					</div>

					<div className="rounded-3xl border border-purple-100 bg-white/85 p-6 text-center shadow-lg backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 shadow-sm">
							<CheckCircle2 className="h-8 w-8 text-purple-600" />
						</div>
						<p className="mb-2 text-sm text-muted-foreground">المهام المكتملة</p>
						<p className="text-4xl font-bold text-slate-900">{formatNumber(tasksCompleted)}</p>
						<span className="text-sm text-muted-foreground">هدفك القادم يبدأ من المهام اليومية</span>
					</div>

					<div className="rounded-3xl border border-sky-100 bg-white/85 p-6 text-center shadow-lg backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 shadow-sm">
							<Target className="h-8 w-8 text-sky-600" />
						</div>
						<p className="mb-2 text-sm text-muted-foreground">نسبة الالتزام الأسبوعية</p>
						<p className="text-4xl font-bold text-slate-900">{focusAverage}%</p>
						<span className="text-sm text-muted-foreground">حافظ على تركيزك واستفد من التذكيرات الذكية</span>
					</div>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4, duration: 0.6 }}
				className="mt-4"
			>
				<Card className="border-0 bg-gradient-to-l from-blue-700 via-blue-600 to-purple-600 shadow-xl">
					<CardContent className="p-0">
						<div className="flex flex-col items-center justify-between gap-6 p-8 text-white lg:flex-row">
							<div className="flex items-center gap-4">
								<div className="rounded-full bg-white/15 p-4 backdrop-blur-md">
									<Zap className="h-8 w-8" />
								</div>
								<div className="text-right">
									<h3 className="text-xl font-bold">دع الذكاء الاصطناعي يرسم خطتك القادمة</h3>
									<p className="text-base text-white/80">
										اكتشف التوزيع المثالي للمواد، أوقات الراحة، والاختبارات القصيرة بناءً على بيانات تقدمك.
									</p>
								</div>
							</div>
							<div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:gap-4">
								<Link href="/ai">
									<Button className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-50">
										<Brain className="h-5 w-5" />
										مساعد الدراسة الذكي
									</Button>
								</Link>
								<Link href="/analytics">
									<Button
										variant="secondary"
										className="flex items-center gap-2 rounded-full border border-white/40 bg-transparent px-6 py-3 text-base text-white hover:bg-white/10"
									>
										<BarChart3 className="h-5 w-5" />
										عرض التحليلات المفصلة
									</Button>
								</Link>
							</div>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.5, duration: 0.6 }}
			>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{miniFeatures.map((feature) => (
						<div
							key={feature.title}
							className="flex flex-col items-end gap-3 rounded-3xl border border-slate-100 bg-white/80 p-5 text-right shadow-lg backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl"
						>
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5">
								{feature.icon}
							</div>
							<span className="text-base font-semibold text-slate-900">{feature.title}</span>
							<p className="text-sm text-muted-foreground">{feature.description}</p>
						</div>
					))}
				</div>
			</motion.div>
		</div>
	);
}

export default HeroSectionEnhanced;
 className="text-base font-bold">ظ…طھط§ط¨ط¹ط© ط§ظ„طھظ‚ط¯ظ…</span>
					<span className="text-sm text-muted-foreground">طھط­ظ„ظٹظ„ ط¯ظ‚ظٹظ‚</span>
				</div>
			</motion.div>
		</div>
	);
}

export default HeroSectionEnhanced;


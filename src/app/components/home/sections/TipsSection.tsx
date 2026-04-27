import Link from "next/link";
import { memo } from "react";
import { m } from "framer-motion";
import { Lightbulb, Zap, Calendar, BarChart3, ArrowRight } from "lucide-react";
import { rpgCommonStyles } from "../constants";

export const TipsSection = memo(function TipsSection() {
	const tips = [
		{
			title: "تقنية التركيز (Mana Regen)",
			description: "استخدم تقنية بومودورو: 25 دقيقة من العمل المركز تليها 5 دقائق لاستعادة طاقتك الذهنية.",
			icon: <Zap className="h-6 w-6 text-yellow-400" />,
			href: "/time",
			action: "بدء المؤقت",
			color: "from-yellow-500/10 to-transparent border-yellow-500/20"
		},
		{
			title: "تكتيك الأسبوع (Strategy)",
			description: "خطط لمهامك (Quests) مسبقاً. تنظيم الوقت يمنحك أفضلية استراتيجية على منافسيك.",
			icon: <Calendar className="h-6 w-6 text-emerald-400" />,
			href: "/schedule",
			action: "تجهيز الخطة",
			color: "from-emerald-500/10 to-transparent border-emerald-500/20"
		},
		{
			title: "تحليل القدرات (Level Up)",
			description: "راجع إحصائياتك بانتظام لتحديد نقاط الضعف وتقويتها قبل خوض المعارك الكبرى.",
			icon: <BarChart3 className="h-6 w-6 text-blue-400" />,
			href: "/progress",
			action: "تحليل الأداء",
			color: "from-blue-500/10 to-transparent border-blue-500/20"
		}
	];

	return (
		<section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-16 shadow-2xl relative overflow-hidden group/section`} aria-labelledby="tips-heading">
			{/* Dynamic Background Elements */}
			<div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-purple-500/5 opacity-50 group-hover/section:opacity-70 transition-opacity duration-1000" />
			<div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] animate-pulse" />
			<div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/5 rounded-full blur-[120px]" />
			
			<m.div 
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 relative z-10"
			>
				<div className="flex items-center gap-6">
					<div className="relative">
						<div className="absolute inset-0 bg-amber-500/40 rounded-3xl blur-xl animate-pulse" />
						<div className="relative p-5 bg-black/40 border-2 border-amber-500/30 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transform -rotate-3 hover:rotate-0 transition-transform duration-500">
							<Lightbulb className="h-10 w-10 text-amber-400 fill-amber-400/20" />
						</div>
					</div>
					<div>
						<h2 id="tips-heading" className={`text-4xl md:text-5xl font-black tracking-tight ${rpgCommonStyles.goldText} mb-2`}>
							نصائح الحكماء
						</h2>
						<p className="text-gray-400 text-lg font-medium border-r-4 border-amber-500/30 pr-4">
							Wisdom & Tactics: تكتيكات مجربة لرفع مستواك الدراسي بذكاء.
						</p>
					</div>
				</div>
			</m.div>

			<div className="grid gap-8 grid-cols-1 lg:grid-cols-3 relative z-10">
				{tips.map((tip, index) => (
					<m.div
						key={index}
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: index * 0.1 }}
						whileHover={{ y: -8 }}
						className={`group rounded-[2rem] bg-gradient-to-br ${tip.color} p-8 border border-white/5 hover:border-white/20 transition-all duration-500 shadow-xl backdrop-blur-md flex flex-col justify-between h-full`}
					>
						<div className="mb-8">
							<div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
								{tip.icon}
							</div>
							<h3 className="font-black text-xl text-gray-100 mb-4 group-hover:text-primary transition-colors leading-tight">{tip.title}</h3>
							<p className="text-gray-400 text-sm leading-relaxed">{tip.description}</p>
						</div>
						
						<Link 
							href={tip.href} 
							className="w-full py-4 bg-white/5 border border-white/10 text-gray-200 rounded-2xl text-center font-black text-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
						>
							<span>{tip.action}</span>
							<ArrowRight className="h-4 w-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180" />
						</Link>
					</m.div>
				))}
			</div>
		</section>
	);
});
TipsSection.displayName = "TipsSection";

export default TipsSection;

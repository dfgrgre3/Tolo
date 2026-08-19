"use client";

import Link from "next/link";
import { memo, type ReactNode } from "react";
import { Lightbulb, Zap, Calendar, BarChart3, ArrowRight } from "lucide-react";
import { rpgCommonStyles } from "../shared/styles";
import { useTips } from "../hooks/useDashboardData";

/** Maps a backend icon key to its lucide icon component. */
const TIP_ICONS: Record<string, ReactNode> = {
	focus: <Zap className="h-6 w-6 text-yellow-400" />,
	planning: <Calendar className="h-6 w-6 text-emerald-400" />,
	analysis: <BarChart3 className="h-6 w-6 text-blue-400" />,
};

export const TipsSection = memo(function TipsSection() {
	const { tips, loading, error } = useTips();

	return (
		<section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-16 shadow-2xl relative overflow-hidden group/section`} aria-labelledby="tips-heading">
			<div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-purple-500/5 opacity-50 group-hover/section:opacity-70" />
			<div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]" />
			<div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/5 rounded-full blur-[120px]" />

			<div
				className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 relative z-10"
			>
				<div className="flex items-center gap-6">
					<div className="relative">
						<div className="absolute inset-0 bg-amber-500/40 rounded-3xl blur-xl" />
						<div className="relative p-5 bg-black/40 border-2 border-amber-500/30 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] -rotate-3">
							<Lightbulb className="h-10 w-10 text-amber-400 fill-amber-400/20" />
						</div>
					</div>
					<div>
						<h2 id="tips-heading" className={`text-4xl md:text-5xl font-black tracking-tight ${rpgCommonStyles.goldText} mb-2`}>
							نصائح مخصصة لك
						</h2>
						<p className="text-gray-400 text-lg font-medium border-r-4 border-amber-500/30 pr-4">
							مبنية على عادات مذاكرتك خلال آخر 14 يوم.
						</p>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="grid gap-8 grid-cols-1 lg:grid-cols-3 relative z-10">
					{[1, 2, 3].map((key) => (
						<div key={key} className="h-64 rounded-[2rem] bg-white/5" />
					))}
				</div>
			) : error ? (
				<p className="text-center text-red-400 font-bold relative z-10">{error}</p>
			) : tips.length === 0 ? (
				<p className="text-center text-gray-500 font-bold relative z-10">
					سجّل جلسات مذاكرة لتظهر لك نصائح مخصصة
				</p>
			) : (
				<div className="grid gap-8 grid-cols-1 lg:grid-cols-3 relative z-10">
					{tips.map((tip, index) => (
						<div
							key={tip.id}
							className={`group rounded-[2rem] bg-gradient-to-br ${tip.color} p-8 border border-white/5 hover:border-white/20 shadow-xl backdrop-blur-md flex flex-col justify-between h-full`}
						>
							<div className="mb-8">
								<div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
									{TIP_ICONS[tip.icon] ?? <Lightbulb className="h-6 w-6 text-amber-400" />}
								</div>
								<h3 className="font-black text-xl text-gray-100 mb-4 group-hover:text-primary leading-tight">{tip.title}</h3>
								<p className="text-gray-400 text-sm leading-relaxed">{tip.description}</p>
							</div>

							<Link
								href={tip.href}
								className="w-full py-4 bg-white/5 border border-white/10 text-gray-200 rounded-2xl text-center font-black text-sm hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
							>
								<span>{tip.action}</span>
								<ArrowRight className="h-4 w-4 rtl:rotate-180" />
							</Link>
						</div>
					))}
				</div>
			)}
		</section>
	);
});
TipsSection.displayName = "TipsSection";

export default TipsSection;

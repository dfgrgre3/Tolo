"use client";

import Link from "next/link";
import { memo, type ReactNode } from "react";
import { Lightbulb, Zap, Calendar, BarChart3, ChevronLeft } from "lucide-react";
import { DashSection, DashEmpty } from "../shared/SectionShell";
import { DASH_CARD, DASH_GRID } from "../shared/design-system";
import { useTips } from "../hooks/useDashboardData";

/** Maps a backend icon key to its lucide icon component. */
const TIP_ICONS: Record<string, ReactNode> = {
	focus: <Zap className="h-5 w-5 text-amber-500" />,
	planning: <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
	analysis: <BarChart3 className="h-5 w-5 text-primary-strong" />,
};

export const TipsSection = memo(function TipsSection() {
	const { tips, loading, error } = useTips();

	return (
		<DashSection
			title="نصائح مخصصة لك"
			subtitle="مبنية على عادات مذاكرتك خلال آخر 14 يوم."
			icon={Lightbulb}
		>
			{loading ? (
				<div className={DASH_GRID.cards3}>
					{[1, 2, 3].map((key) => (
						<div key={key} className="h-48 rounded-lg bg-muted border border-border animate-pulse" />
					))}
				</div>
			) : error ? (
				<DashEmpty icon={Lightbulb} title="تعذر تحميل النصائح" description={error} />
			) : tips.length === 0 ? (
				<DashEmpty
					icon={Lightbulb}
					title="لا توجد نصائح بعد"
					description="سجّل جلسات مذاكرة لتظهر لك نصائح مخصصة"
				/>
			) : (
				<div className={DASH_GRID.cards3}>
					{tips.map((tip) => (
						<div
							key={tip.id}
							className={`${DASH_CARD.base} group flex h-full flex-col justify-between p-4`}
						>
							<div className="mb-4">
								<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 border border-border">
									{TIP_ICONS[tip.icon] ?? <Lightbulb className="h-5 w-5 text-amber-500" />}
								</div>
								<h3 className="font-black text-base text-foreground mb-1.5 group-hover:text-primary-strong leading-tight">{tip.title}</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">{tip.description}</p>
							</div>

							<Link
								href={tip.href}
								className="inline-flex items-center justify-center gap-1 text-xs font-black text-primary-strong hover:bg-primary/10 px-2.5 py-1.5 rounded-md w-fit transition-colors"
							>
								{tip.action}
								<ChevronLeft className="h-4 w-4" aria-hidden="true" />
							</Link>
						</div>
					))}
				</div>
			)}
		</DashSection>
	);
});
TipsSection.displayName = "TipsSection";

export default TipsSection;

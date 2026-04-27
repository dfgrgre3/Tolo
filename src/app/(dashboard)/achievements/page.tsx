"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { m, AnimatePresence } from "framer-motion";
import { useAchievements } from './hooks/useAchievements';
import { AchievementStats } from './components/AchievementStats';
import { AchievementFilters } from './components/AchievementFilters';
import { AchievementCard } from './components/AchievementCard';
import { LoadingState } from './components/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Info, Clock, BookOpen, Star, Target, Zap, Search, Sword, Scroll } from 'lucide-react';


const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function AchievementsPage() {
	const {
		achievements,
		filteredAchievements,
		userProgress,
		stats,
		loading,
		error,
		filters,
		setFilters,
		refetch,
	} = useAchievements();

	const [showCelebration, setShowCelebration] = useState(false);

	const recentAchievements = useMemo(() => {
		if (achievements.length === 0) return [];
		const earned = achievements.filter((a) => a.isEarned && a.earnedAt);
		const sorted = [...earned].sort((a,b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime());
		return sorted.slice(0, 3).map((a) => a.id);
	}, [achievements]);

	const hasRecentEarning = useMemo(() => {
		if (achievements.length === 0) return false;
		const twentyFourHours = 24 * 60 * 60 * 1000;
		const now = new Date().getTime();
		return achievements.some(a => a.isEarned && a.earnedAt && (now - new Date(a.earnedAt).getTime() < twentyFourHours));
	}, [achievements]);

	useEffect(() => {
		if (hasRecentEarning) {
			setShowCelebration(true);
		}
	}, [hasRecentEarning]);

  const debouncedHideCelebration = useCallback(() => {
    const timer = setTimeout(() => {
      setShowCelebration(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showCelebration) {
      debouncedHideCelebration();
    }
  }, [showCelebration, debouncedHideCelebration]);

	return (
		<div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
			{/* --- Ambient Background --- */}
			<div className="fixed inset-0 pointer-events-none -z-10">
				<div className="absolute top-0 left-0 w-full h-[600px] bg-primary/10 rounded-b-[100%] blur-[120px] opacity-40" />
				<div className="absolute top-40 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-[100px] animate-pulse duration-5000" />
				<div className="absolute bottom-40 left-10 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] animate-pulse duration-7000" />
				<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
			</div>

			<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
				
				{/* --- Hero Header Section --- */}
				<m.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					className={STYLES.glass + " p-8 md:p-16 text-center md:text-right flex flex-col md:flex-row items-center justify-between gap-12 group overflow-hidden"}
				>
					<div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-700" />
					<div className="relative z-10 space-y-6 flex-1">
						<div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
							<Sparkles className="h-5 w-5" />
							<span>قاعة الأساطير والخلود</span>
						</div>
						<h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
							سجل <span className={STYLES.neonText}>الإنجازات الملحمية</span>
						</h1>
						<p className="text-lg md:text-xl text-gray-400 font-medium max-w-xl">
							كل تحدٍ تفوز به هو علامة في تاريخك العسكري. هنا توثيق لكل المعارك التي خضتها والانتصارات التي حققتها.
						</p>
					</div>

					{userProgress && (
						<div className="relative group">
							 <div className="absolute inset-0 bg-primary/20 blur-[100px] group-hover:bg-primary/40 transition-all duration-700" />
							 <div className="relative h-48 w-48 rounded-[3rem] bg-black/40 border-2 border-white/10 flex flex-col items-center justify-center p-8 backdrop-blur-3xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
								 <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">المستوى الحالي</p>
								 <p className={STYLES.neonText + " text-7xl font-black underline decoration-primary/50"}>{userProgress.level}</p>
								 <div className="flex items-center gap-1.5 mt-3 px-3 py-1 bg-white/5 rounded-full border border-white/10">
									 <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
									 <span className="text-white font-black text-xs">{userProgress.totalXP.toLocaleString()} XP</span>
								 </div>
							 </div>
						</div>
					)}
				</m.div>

				{/* Loading State */}
				{loading && <LoadingState />}

				{/* Error State */}
				{error && (
					<m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={STYLES.glass + " border-red-500/20 bg-red-500/5 p-8 text-center md:text-right"}>
						<div className="flex flex-col md:flex-row items-center gap-6">
							<div className="p-4 bg-red-500/10 rounded-3xl text-red-500">
								<Info className="h-10 w-10" />
							</div>
							<div className="flex-1 space-y-2">
								<h3 className="font-black text-2xl text-red-500">حدث خطأ في استدعاء الذكريات</h3>
								<p className="text-gray-400 font-medium">{error}</p>
							</div>
							<Button variant="destructive" onClick={refetch} className="h-14 px-10 rounded-2xl font-black shadow-lg shadow-red-500/20">
								إعادة استدعاء
							</Button>
						</div>
					</m.div>
				)}

				{/* Main Content */}
				{!loading && !error && (
					<div className="space-y-16">
						<AnimatePresence>
							{showCelebration && (
								<m.div 
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.9 }}
									className={STYLES.glass + " border-primary/40 bg-primary/5 p-8 relative overflow-hidden group"}
								>
									<div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
									<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
										<div className="flex items-center gap-6">
											<div className="h-16 w-16 rounded-3xl bg-amber-500 flex items-center justify-center text-4xl animate-bounce shadow-lg shadow-amber-500/30">
												ًںژ‰
											</div>
											<div className="space-y-1 text-center md:text-right">
												<h3 className="text-2xl font-black text-white">يوم عظيم للجمهورية!</h3>
												<p className="text-gray-400 font-medium">لقد حصلت على أساطير جديدة تليق بمقامك العالي. تفقد سجلاتك الآن!</p>
											</div>
										</div>
										<Button variant="ghost" onClick={() => setShowCelebration(false)} className="h-12 px-6 rounded-xl hover:bg-white/5 uppercase font-black text-xs tracking-widest text-gray-500">إغلاق التنبيه</Button>
									</div>
								</m.div>
							)}
						</AnimatePresence>

						{/* Statistics */}
						{stats && (
							<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
								<AchievementStats stats={stats} userProgress={userProgress} />
							</m.div>
						)}

						{/* Main Layout Grid */}
						<div className="flex flex-col lg:flex-row gap-12">
							
							{/* Filters Sidebar */}
							<aside className="lg:w-80 flex-shrink-0">
								<div className="sticky top-8 space-y-4">
									<div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-widest text-gray-400 mb-6">
										<span>نظام الفلترة</span>
										<ListFilter className="w-4 h-4" />
									</div>
									<AchievementFilters filters={filters} onFiltersChange={setFilters} />
								</div>
							</aside>

							{/* Content Area */}
							<div className="flex-1 space-y-16">
								{/* Recent Achievements */}
								{recentAchievements.length > 0 && filters.status === 'all' && (
									<div className="space-y-8">
										<div className="flex items-center gap-4">
											<div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
											<h2 className="text-3xl font-black flex items-center gap-3">
												<Sparkles className="h-6 w-6 text-amber-500" />
												<span>أحدث التحف المكتسبة</span>
											</h2>
											<div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
											{filteredAchievements
												.filter((a) => recentAchievements.includes(a.id))
												.map((achievement, index) => (
													<AchievementCard
														key={`recent-${achievement.id}`}
														achievement={achievement}
														index={index}
													/>
												))}
										</div>
									</div>
								)}

								{/* All Achievements Inventory */}
								<div className="space-y-8">
									<div className="flex items-center justify-between gap-6 border-b border-white/5 pb-8 flex-wrap">
										<h2 className="text-3xl font-black flex items-center gap-4">
											<Sword className="h-7 w-7 text-primary" />
											<span>مخزن المهارات والألقاب</span>
											{filteredAchievements.length !== achievements.length && (
												<Badge className="bg-primary/20 text-primary border-primary/20 px-4 py-1.5 font-black uppercase text-xs">
													{filteredAchievements.length} نتيجة بحث عسكري
												</Badge>
											)}
										</h2>
									</div>

									{filteredAchievements.length === 0 ? (
										<m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={STYLES.glass + " p-20 text-center space-y-8 border-dashed"}>
											<div className="p-8 bg-white/5 rounded-full inline-flex items-center justify-center border border-white/5">
												<Search className="w-20 h-20 text-gray-700" />
											</div>
											<div className="space-y-2">
												<h3 className="text-3xl font-black text-white">لم نجد أي أثر لهذا الطلب</h3>
												<p className="text-gray-500 font-medium max-w-lg mx-auto">معايير البحث هذه لم تكشف عن أي إنجازات في السجلات الملكية. جرب استخدام مفاتيح تصفية مختلفة.</p>
											</div>
											<Button
												onClick={() => setFilters({ search: '', category: 'all', difficulty: 'all', status: 'all' })}
												className="h-16 px-12 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all shadow-xl"
											>
												إعادة تعيين كامل للسجلات
											</Button>
										</m.div>
									) : (
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
											<AnimatePresence mode="popLayout">
												{filteredAchievements.map((achievement, index) => (
													<AchievementCard
														key={achievement.id}
														achievement={achievement}
														index={index}
													/>
												))}
											</AnimatePresence>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* The Guide: Visual Redesign */}
						<m.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
							<Card className={STYLES.glass + " p-0 border border-white/5 relative group overflow-hidden"}>
								<div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
								<CardHeader className="p-10 pb-4 relative z-10 flex flex-col md:flex-row items-center justify-between border-b border-white/5">
									<div className="space-y-2">
										<CardTitle className="text-3xl font-black flex items-center gap-4">
											<div className="p-3 bg-primary/10 rounded-2xl">
												<Info className="h-8 w-8 text-primary" />
											</div>
											<span>دستور ترقية الرتب العسكرية</span>
										</CardTitle>
										<p className="text-gray-400 font-medium mr-16">اتبع المسارات القتالية المعتمدة للحصول على أعلى الألقاب الملكية.</p>
									</div>
									<Button variant="ghost" className="h-12 px-6 rounded-xl hover:bg-white/5 gap-2 font-black text-xs uppercase tracking-[0.2em] text-gray-500 mt-4 md:mt-0">
										<Scroll className="w-5 h-5" />
										<span>تحميل الدستور</span>
									</Button>
								</CardHeader>
								<CardContent className="p-10 relative z-10">
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
										{[
											{
												icon: <BookOpen className="w-10 h-10 text-blue-500" />,
												bg: "from-blue-500/10 to-transparent",
												title: "طريق العلماء",
												items: ["دراسة مكثفة لمدة 100 ساعة", "استكمال 3 مواد أساسية", "دقة تعليمية 95%+"]
											},
											{
												icon: <Target className="w-10 h-10 text-emerald-500" />,
												bg: "from-emerald-500/10 to-transparent",
												title: "طريق المحاربين",
												items: ["إنجاز 50 مهمة استباقية", "الحصول على وسام الأسبوع", "تجاوز الأهداف اليومية"]
											},
											{
												icon: <Zap className="w-10 h-10 text-amber-500" />,
												bg: "from-amber-500/10 to-transparent",
												title: "طريق السحرة",
												items: ["الحصول على علامات كاملة", "حل أحاجي الامتحان السري", "تحطيم الرقم القياسي الأسبوعي"]
											},
											{
												icon: <Clock className="w-10 h-10 text-purple-500" />,
												bg: "from-purple-500/10 to-transparent",
												title: "طريق الجنرالات",
												items: ["الالتزام بالجدول لـ 30 يوماً", "جلسات دراسة عميقة (بومودورو)", "تنظيم جيوش الوقت بدقة"]
											}
										].map((item, i) => (
											<m.div 
												key={i}
												whileHover={{ y: -5 }}
												className={`p-8 rounded-[2rem] bg-gradient-to-b ${item.bg} border border-white/5 backdrop-blur-3xl relative overflow-hidden group/item`}
											>
												<div className="absolute -top-4 -right-4 p-8 bg-white/5 rounded-full blur-[40px] opacity-20 group-hover/item:opacity-40 transition-opacity" />
												<div className="p-4 bg-black/40 rounded-3xl w-max mb-6 border border-white/10 shadow-xl">
													{item.icon}
												</div>
												<h3 className="font-black text-xl mb-6 text-white group-hover/item:text-primary transition-colors">{item.title}</h3>
												<ul className="space-y-4">
													{item.items.map((line, j) => (
														<li key={j} className="text-sm font-bold text-gray-500 flex items-start gap-4">
															<span className="w-2 h-2 rounded-full bg-primary/40 mt-1.5 flex-shrink-0" />
															<span className="leading-relaxed">{line}</span>
														</li>
													))}
												</ul>
											</m.div>
										))}
									</div>
								</CardContent>
							</Card>
						</m.div>
					</div>
				)}
			</div>
		</div>
	);
}

function ListFilter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  )
}

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/shared/button";
import { Card, CardContent } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Clock, Flame, CheckCircle2, TrendingUp, Target, Zap, Play, Star, BookOpen, Users, Brain, Award, ArrowRight, Sparkles, Lightbulb, BarChart3, MessageSquare, Calendar, FileText, Trophy, LogIn } from 'lucide-react';
import Image from "next/image";

export function HeroSectionEnhanced({ summary, priority = false }: {
  summary: { totalMinutes: number; averageFocus: number; tasksCompleted: number; streakDays: number } | null;
  priority?: boolean;
}) {
	return (
		<div className="max-w-7xl mx-auto text-center md:text-right">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<div className="mb-8 md:mb-12">
					<motion.div
						className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-lg"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.1 }}
					>
						<Badge className="bg-white text-blue-600 hover:bg-blue-50 border-0">
							<Sparkles className="h-3 w-3 mr-1" />
							ط¬ط¯ظٹط¯ ظˆظ…ط­ط³ظ‘ظ†
						</Badge>
						<span className="text-sm font-medium text-white">ط§ظ„ظ…ظ†طµط© ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ط§ظ„ط£ظƒط«ط± طھط·ظˆط±ط§ظ‹ ظ„ط¹ط§ظ… 2024</span>
					</motion.div>

					<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 justify-center md:justify-start">
						<motion.span
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
						>
							ط§ط¨ط¯ط£ ط±ط­ظ„طھظƒ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©
						</motion.span>
						<motion.span
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent"
						>
							ط¨ط°ظƒط§ط، ًںڑ€
						</motion.span>
					</h1>
					<motion.p
						className="text-muted-foreground max-w-3xl text-xl md:text-2xl leading-relaxed mb-8 md:mb-10 mx-auto md:mx-0"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4 }}
					>
						ظ…ظ†طµط© ظ…طھظƒط§ظ…ظ„ط© ظ„طھظ†ط¸ظٹظ… ط§ظ„ظˆظ‚طھطŒ ظ…طھط§ط¨ط¹ط© ط§ظ„طھظ‚ط¯ظ…طŒ ط§ظ„ظ…ظˆط§ط±ط¯ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©طŒ ظˆط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„طھط¬ط±ظٹط¨ظٹط© ظ…ط¹ طھظ‚ظ†ظٹط§طھ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ط§ظ„ظ…طھظ‚ط¯ظ…ط©.
					</motion.p>
					<motion.div
						className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 }}
					>
						<Link href="/getting-started">
							<Button size="lg" className="px-10 py-7 text-xl shadow-xl hover:shadow-2xl transition-all group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0">
								ط§ط¨ط¯ط£ ط±ط­ظ„طھظƒ ط§ظ„ط¢ظ†
								<ArrowRight className="mr-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
							</Button>
						</Link>
						<Link href="/demo">
							<Button size="lg" variant="outline" className="px-10 py-7 text-xl border-2 hover:bg-primary/5 transition-all">
								<Play className="ml-2 h-5 w-5" />
								ط´ط§ظ‡ط¯ طھط¬ط±ط¨ط© طھظپط§ط¹ظ„ظٹط©
							</Button>
						</Link>
				<Link href="/login">
					<Button size="lg" variant="secondary" className="px-10 py-7 text-xl border-2 border-blue-200 text-blue-600 bg-white hover:bg-blue-50 transition-all flex items-center justify-center">
						<LogIn className="ml-2 h-5 w-5" />
						تسجيل الدخول
					</Button>
				</Link>
					</motion.div>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.8, duration: 0.5 }}
			>
				<div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-10 md:mt-16">
					<motion.div
						className="rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center"
						whileHover={{ y: -8, scale: 1.03 }}
						transition={{ type: "spring", stiffness: 300 }}
					>
						<div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-4 shadow-md">
							<Clock className="h-8 w-8 text-blue-600" />
						</div>
						<p className="text-sm text-muted-foreground mb-2">ط¥ط¬ظ…ط§ظ„ظٹ ط³ط§ط¹ط§طھ ط§ظ„ط¯ط±ط§ط³ط©</p>
						<p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{summary ? Math.round(summary.totalMinutes / 60) : 0} ط³ط§ط¹ط©</p>
						<div className="flex items-center mt-3 text-green-600 text-sm font-medium">
							<TrendingUp className="h-4 w-4 mr-1" />
							<span>+12% ظ…ظ† ط§ظ„ط£ط³ط¨ظˆط¹ ط§ظ„ظ…ط§ط¶ظٹ</span>
						</div>
					</motion.div>

					<motion.div
						className="rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center"
						whileHover={{ y: -8, scale: 1.03 }}
						transition={{ type: "spring", stiffness: 300 }}
					>
						<div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4 shadow-md">
							<Flame className="h-8 w-8 text-orange-600" />
						</div>
						<p className="text-sm text-muted-foreground mb-2">ط£ظٹط§ظ… ط§ظ„ظ…ط¯ط§ظˆظ…ط©</p>
						<p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{summary?.streakDays ?? 0} ظٹظˆظ…</p>
						<div className="flex items-center mt-3 text-green-600 text-sm font-medium">
							<Zap className="h-4 w-4 mr-1" />
							<span>ط±ط§ط¦ط¹! ط§ط³طھظ…ط±!</span>
						</div>
					</motion.div>

					<motion.div
						className="rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center"
						whileHover={{ y: -8, scale: 1.03 }}
						transition={{ type: "spring", stiffness: 300 }}
					>
						<div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-4 shadow-md">
							<CheckCircle2 className="h-8 w-8 text-purple-600" />
						</div>
						<p className="text-sm text-muted-foreground mb-2">ط§ظ„ظ…ظ‡ط§ظ… ط§ظ„ظ…ظƒطھظ…ظ„ط©</p>
						<p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{summary?.tasksCompleted ?? 0} ظ…ظ‡ظ…ط©</p>
						<div className="flex items-center mt-3 text-green-600 text-sm font-medium">
							<Target className="h-4 w-4 mr-1" />
							<span>{summary?.tasksCompleted ? Math.round((summary.tasksCompleted / 20) * 100) : 0}% ظ…ظ† ط§ظ„ظ‡ط¯ظپ</span>
						</div>
					</motion.div>

					<motion.div
						className="rounded-2xl border bg-white/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center"
						whileHover={{ y: -8, scale: 1.03 }}
						transition={{ type: "spring", stiffness: 300 }}
					>
						<div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-4 shadow-md">
							<Target className="h-8 w-8 text-green-600" />
						</div>
						<p className="text-sm text-muted-foreground mb-2">ظ…ط¹ط¯ظ„ ط§ظ„طھط±ظƒظٹط²</p>
						<p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{summary?.averageFocus ?? 0}%</p>
						<div className="flex items-center mt-3 text-green-600 text-sm font-medium">
							<TrendingUp className="h-4 w-4 mr-1" />
							<span>+5% ظ…ظ† ط§ظ„ط´ظ‡ط± ط§ظ„ظ…ط§ط¶ظٹ</span>
						</div>
					</motion.div>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1.2 }}
				className="mt-12 md:mt-16"
			>
				<Card className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl overflow-hidden">
					<CardContent className="p-0">
						<div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 text-white">
							<div className="flex items-center gap-4">
								<div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
									<Zap className="h-8 w-8" />
								</div>
								<div>
									<h3 className="font-bold text-xl">ط¬ط§ظ‡ط² ظ„طھط­ط³ظٹظ† ط£ط¯ط§ط¦ظƒطں</h3>
									<p className="text-blue-100 text-lg">ط§ط¨ط¯ط£ ط±ط­ظ„طھظƒ ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ظ…ط¹ ط£ط¯ظˆط§طھ ظ…طھط·ظˆط±ط©</p>
								</div>
							</div>
							<div className="flex gap-4">
								<Link href="/ai">
									<Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 text-lg border-0 shadow-lg">
										<Brain className="h-5 w-5 ml-2" />
										ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ
									</Button>
								</Link>
								<Link href="/analytics">
									<Button className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 text-lg border-0 shadow-lg">
										<BarChart3 className="h-5 w-5 ml-2" />
										طھط­ظ„ظٹظ„ ط§ظ„طھظ‚ط¯ظ…
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
				transition={{ delay: 1.4 }}
				className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6"
			>
				<div className="flex flex-col items-center gap-3 p-5 bg-white/80 backdrop-blur rounded-2xl border shadow-md hover:shadow-lg transition-all">
					<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
						<BookOpen className="h-6 w-6 text-blue-600" />
					</div>
					<span className="text-base font-bold">ظ…ظˆط§ط¯ ط¯ط±ط§ط³ظٹط©</span>
					<span className="text-sm text-muted-foreground">ط´ط§ظ…ظ„ط© ظˆظ…ط­ط¯ط«ط©</span>
				</div>
				<div className="flex flex-col items-center gap-3 p-5 bg-white/80 backdrop-blur rounded-2xl border shadow-md hover:shadow-lg transition-all">
					<div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
						<Users className="h-6 w-6 text-purple-600" />
					</div>
					<span className="text-base font-bold">ظ…ط¯ط±ط³ظٹظ† ط®ط¨ط±ط§ط،</span>
					<span className="text-sm text-muted-foreground">ط¯ط¹ظ… ظ…طھظˆط§طµظ„</span>
				</div>
				<div className="flex flex-col items-center gap-3 p-5 bg-white/80 backdrop-blur rounded-2xl border shadow-md hover:shadow-lg transition-all">
					<div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
						<Brain className="h-6 w-6 text-amber-600" />
					</div>
					<span className="text-base font-bold">ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ</span>
					<span className="text-sm text-muted-foreground">طھظ‚ظ†ظٹط§طھ ظ…طھظ‚ط¯ظ…ط©</span>
				</div>
				<div className="flex flex-col items-center gap-3 p-5 bg-white/80 backdrop-blur rounded-2xl border shadow-md hover:shadow-lg transition-all">
					<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
						<Trophy className="h-6 w-6 text-green-600" />
					</div>
					<span className="text-base font-bold">ظ…طھط§ط¨ط¹ط© ط§ظ„طھظ‚ط¯ظ…</span>
					<span className="text-sm text-muted-foreground">طھط­ظ„ظٹظ„ ط¯ظ‚ظٹظ‚</span>
				</div>
			</motion.div>
		</div>
	);
}

export default HeroSectionEnhanced;


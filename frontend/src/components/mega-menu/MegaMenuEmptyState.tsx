"use client";

import { m } from "framer-motion";
import { Search, Sparkles, BookOpen, Brain, Calendar, HelpCircle } from "lucide-react";
import Link from "next/link";

interface QuickAction {
	label: string;
	href: string;
	icon: any;
	color: string;
}

const QuickActions: QuickAction[] = [
	{ label: "الأكاديمية والدورات", href: "/courses", icon: BookOpen, color: "from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-cyan-400 border-blue-500/30" },
	{ label: "جدول المحاضرات والامتحانات", href: "/schedule", icon: Calendar, color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" },
	{ label: "المساعد الذكي AI", href: "/ai", icon: Brain, color: "from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30" },
];

interface MegaMenuEmptyStateProps {
	searchQuery: string;
	onClose: () => void;
}

export function MegaMenuEmptyState({ searchQuery, onClose }: MegaMenuEmptyStateProps) {
	return (
		<m.div
			key="no-results"
			initial={{ opacity: 0, y: 20, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -20, scale: 0.95 }}
			transition={{ type: "spring", stiffness: 300, damping: 30 }}
			className="flex flex-col items-center justify-center py-16 px-4 max-w-xl mx-auto"
		>
			<m.div
				animate={{ 
					rotate: [0, 5, -5, 0],
					scale: [1, 1.05, 0.98, 1]
				}}
				transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
				className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-lg shadow-primary/5 relative"
			>
				<div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
				<Search className="h-10 w-10 text-primary relative z-10" />
			</m.div>

			<m.h3
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="text-xl font-black text-foreground mb-2 text-center"
			>
				لم نجد أي نتائج لـ &quot;{searchQuery}&quot;
			</m.h3>

			<m.p
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="text-sm text-muted-foreground text-center leading-relaxed mb-8"
			>
				تأكد من كتابة الكلمة بشكل صحيح، أو يمكنك استعراض بعض من أهم أقسام المنصة المقترحة بالأسفل لتوفير الوقت.
			</m.p>

			{/* Suggested Actions */}
			<m.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3 }}
				className="w-full space-y-3"
			>
				<div className="flex items-center gap-2 mb-2 justify-center">
					<Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
					<span className="text-xs font-bold text-foreground uppercase tracking-wider">نقترح عليك زيارة:</span>
				</div>

				<div className="grid grid-cols-1 gap-2.5 w-full">
					{QuickActions.map((action, index) => {
						const Icon = action.icon;
						return (
							<m.div
								key={action.href}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.4 + index * 0.08 }}
								whileHover={{ scale: 1.02, x: 2 }}
								whileTap={{ scale: 0.98 }}
							>
								<Link
									href={action.href}
									onClick={onClose}
									className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r border transition-all duration-300 hover:shadow-md hover:shadow-primary/5 ${action.color}`}
								>
									<div className="p-2 rounded-lg bg-background/80 border border-current/10">
										<Icon className="h-4 w-4" />
									</div>
									<span className="font-bold text-sm flex-1 text-right">{action.label}</span>
									<span className="text-xs opacity-70 hover:opacity-100 flex items-center gap-0.5">
										انتقال
										<span className="font-mono">←</span>
									</span>
								</Link>
							</m.div>
						);
					})}
				</div>
			</m.div>
		</m.div>
	);
}

"use client";

import { m } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";

interface QuickAction {
	label: string;
	href: string;
	icon: string;
}

const QuickActions: QuickAction[] = [
	{ label: "دورات", href: "/courses", icon: "📚" },
	{ label: "جدول", href: "/schedule", icon: "📅" },
	{ label: "مكتبة", href: "/library", icon: "📖" },
	{ label: "AI", href: "/ai", icon: "🤖" },
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
			className="flex flex-col items-center justify-center py-16 px-4"
		>
			<m.div
				animate={{ 
					rotate: [0, 10, -10, 0],
					scale: [1, 1.1, 1]
				}}
				transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
				className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60 border border-border/50 shadow-lg"
			>
				<Search className="h-10 w-10 text-muted-foreground" />
			</m.div>
			<m.h3
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
				className="text-xl font-bold text-foreground mb-2"
			>
				لا توجد نتائج
			</m.h3>
			<m.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
				className="text-sm text-muted-foreground text-center max-w-md leading-relaxed mb-6"
			>
				لم نجد أي عناصر تطابق <span className="font-semibold text-primary">&quot;{searchQuery}&quot;</span>. جرب كلمات مفتاحية مختلفة أو ابحث بطريقة أخرى.
			</m.p>

			{/* Quick Actions */}
			<m.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className="flex items-center gap-3"
			>
				<span className="text-xs text-muted-foreground">روابط سريعة:</span>
				{QuickActions.map((action, index) => (
					<m.div
						key={action.href}
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.5 + index * 0.1 }}
					>
						<Link
							href={action.href}
							onClick={onClose}
							className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
						>
							<span>{action.icon}</span>
							<span>{action.label}</span>
						</Link>
					</m.div>
				))}
			</m.div>
		</m.div>
	);
}

"use client";

import Link from 'next/link';
import { Button } from '@/shared/button';
import { Trophy, Target, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function EmptyState() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="text-center py-16"
		>
			<motion.div
				animate={{ rotate: [0, 10, -10, 0] }}
				transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
				className="text-7xl mb-6"
			>
				🏆
			</motion.div>
			<h2 className="text-2xl font-bold mb-3">لم تحصل على أي إنجازات بعد</h2>
			<p className="text-muted-foreground mb-8 max-w-md mx-auto">
				استمر في المذاكرة وإكمال المهام للحصول على إنجازات رائعة وتقدم في مستواك!
			</p>
			<div className="flex flex-col sm:flex-row gap-4 justify-center">
				<Button asChild>
					<Link href="/tasks">
						<Target className="h-4 w-4 ml-2" />
						ابدأ المهام
						<ArrowRight className="h-4 w-4 mr-2" />
					</Link>
				</Button>
				<Button variant="outline" asChild>
					<Link href="/time">
						<Trophy className="h-4 w-4 ml-2" />
						ابدأ الدراسة
						<ArrowRight className="h-4 w-4 mr-2" />
					</Link>
				</Button>
			</div>
		</motion.div>
	);
}


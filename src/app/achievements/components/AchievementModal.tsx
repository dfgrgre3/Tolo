"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/shared/badge';
import { Achievement } from '../types';
import {
	getCategoryIcon,
	getCategoryLabel,
	getDifficultyLabel,
	getDifficultyColor,
	getRarityColor,
	getRarityLabel,
	formatArabicDate,
} from '../utils';
import { Trophy, Lock, Zap, X, Calendar, Target, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface AchievementModalProps {
	achievement: Achievement;
	isOpen: boolean;
	onClose: () => void;
}

export function AchievementModal({ achievement, isOpen, onClose }: AchievementModalProps) {
	const isEarned = achievement.isEarned || false;
	const rarity = achievement.rarity || 'common';

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-start gap-4">
						<motion.div
							initial={{ scale: 0, rotate: -180 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{ type: 'spring', stiffness: 200, damping: 15 }}
							className={`text-6xl ${
								isEarned ? '' : 'grayscale opacity-50'
							}`}
						>
							{achievement.icon || getCategoryIcon(achievement.category)}
						</motion.div>
						<div className="flex-1">
							<DialogTitle className="text-2xl mb-2">{achievement.title}</DialogTitle>
							<div className="flex flex-wrap gap-2 mb-4">
								<Badge
									variant="outline"
									className={getDifficultyColor(achievement.difficulty)}
								>
									{getDifficultyLabel(achievement.difficulty)}
								</Badge>
								<Badge variant="outline" className={getRarityColor(rarity)}>
									{getRarityLabel(rarity)}
								</Badge>
								<Badge variant="outline">
									{getCategoryIcon(achievement.category)} {getCategoryLabel(achievement.category)}
								</Badge>
							</div>
						</div>
						{isEarned ? (
							<Trophy className="h-6 w-6 text-yellow-500" />
						) : (
							<Lock className="h-6 w-6 text-muted-foreground" />
						)}
					</div>
				</DialogHeader>

				<div className="space-y-6">
					{/* Description */}
					{(!achievement.isSecret || isEarned) && (
						<div>
							<h4 className="font-semibold mb-2 flex items-center gap-2">
								<Award className="h-4 w-4" />
								الوصف
							</h4>
							<p className="text-muted-foreground">{achievement.description}</p>
						</div>
					)}

					{/* Stats */}
					<div className="grid grid-cols-2 gap-4">
						<div className="p-4 rounded-lg border bg-secondary/50">
							<div className="flex items-center gap-2 mb-2">
								<Zap className="h-4 w-4 text-yellow-500" />
								<span className="text-sm text-muted-foreground">النقاط</span>
							</div>
							<div className="text-2xl font-bold">{achievement.xpReward} XP</div>
						</div>

						{achievement.progress !== undefined && achievement.maxProgress && (
							<div className="p-4 rounded-lg border bg-secondary/50">
								<div className="flex items-center gap-2 mb-2">
									<Target className="h-4 w-4 text-blue-500" />
									<span className="text-sm text-muted-foreground">التقدم</span>
								</div>
								<div className="text-2xl font-bold">
									{achievement.progress} / {achievement.maxProgress}
								</div>
								<div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
										style={{
											width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
										} as React.CSSProperties}
									/>
								</div>
							</div>
						)}
					</div>

					{/* Requirements */}
					{Object.keys(achievement.requirements).length > 0 && (
						<div>
							<h4 className="font-semibold mb-2">المتطلبات</h4>
							<div className="space-y-2">
								{Object.entries(achievement.requirements).map(([key, value]) => (
									<div
										key={key}
										className="flex items-center justify-between p-2 rounded border bg-secondary/30"
									>
										<span className="text-sm text-muted-foreground">{key}</span>
										<span className="font-medium">{String(value)}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Earned Date */}
					{isEarned && achievement.earnedAt && (
						<div className="flex items-center gap-2 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
							<Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
							<div>
								<div className="text-sm text-muted-foreground">تم الحصول عليها في</div>
								<div className="font-semibold text-green-700 dark:text-green-400">
									{formatArabicDate(achievement.earnedAt)}
								</div>
							</div>
						</div>
					)}

					{/* Locked Message */}
					{!isEarned && (
						<div className="p-4 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20">
							<div className="flex items-start gap-2">
								<Lock className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
								<div>
									<div className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
										إنجاز غير محرز
									</div>
									<div className="text-sm text-orange-700 dark:text-orange-400">
										{achievement.progress !== undefined && achievement.maxProgress
											? `أنت على بعد ${achievement.maxProgress - achievement.progress} خطوة من الحصول على هذا الإنجاز!`
											: 'استمر في المذاكرة وإكمال المهام للحصول على هذا الإنجاز'}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}


"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/shared/card';
import { Badge } from '@/shared/badge';
import { Achievement } from '../types';
import {
	getCategoryIcon,
	getDifficultyLabel,
	getDifficultyColor,
	getRarityColor,
	getRarityLabel,
	formatRelativeTime,
} from '../utils';
import {
	Trophy,
	Lock,
	Zap,
	Eye,
	EyeOff,
	Sparkles,
	Award,
	Clock,
} from 'lucide-react';
import { AchievementModal } from './AchievementModal';

interface AchievementCardProps {
	achievement: Achievement;
	index?: number;
}

export function AchievementCard({ achievement, index = 0 }: AchievementCardProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const isEarned = achievement.isEarned || false;
	const rarity = achievement.rarity || 'common';

	const cardVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: (i: number) => ({
			opacity: 1,
			y: 0,
			transition: {
				delay: i * 0.05,
				duration: 0.3,
			},
		}),
		hover: {
			scale: 1.02,
			transition: { duration: 0.2 },
		},
	};

	return (
		<>
			<motion.div
				variants={cardVariants}
				initial="hidden"
				animate="visible"
				custom={index}
				whileHover="hover"
				className="h-full"
			>
				<Card
					className={`h-full cursor-pointer transition-all duration-300 ${
						isEarned
							? 'border-2 border-primary/50 bg-gradient-to-br from-background to-primary/5 hover:shadow-lg hover:shadow-primary/20'
							: 'border border-muted opacity-75 hover:opacity-100 hover:shadow-md'
					}`}
					onClick={() => setIsModalOpen(true)}
				>
					<CardContent className="p-5">
						<div className="flex flex-col h-full">
							{/* Header with Icon and Status */}
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-3 flex-1">
									<div
										className={`text-4xl transition-transform duration-300 ${
											isEarned ? 'animate-pulse' : 'grayscale opacity-50'
										}`}
									>
										{achievement.icon || getCategoryIcon(achievement.category)}
									</div>
									<div className="flex-1 min-w-0">
										<h3
											className={`font-bold text-lg mb-1 line-clamp-2 ${
												isEarned ? 'text-foreground' : 'text-muted-foreground'
											}`}
										>
											{achievement.title}
										</h3>
										{achievement.isSecret && !isEarned && (
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<EyeOff className="h-3 w-3" />
												<span>إنجاز سري</span>
											</div>
										)}
									</div>
								</div>
								{isEarned ? (
									<Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0" />
								) : (
									<Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
								)}
							</div>

							{/* Description */}
							{(!achievement.isSecret || isEarned) && (
								<p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
									{achievement.description}
								</p>
							)}

							{/* Badges */}
							<div className="flex flex-wrap gap-2 mb-4">
								<Badge
									variant="outline"
									className={`text-xs ${getDifficultyColor(achievement.difficulty)}`}
								>
									{getDifficultyLabel(achievement.difficulty)}
								</Badge>
								<Badge
									variant="outline"
									className={`text-xs ${getRarityColor(rarity)}`}
								>
									{getRarityLabel(rarity)}
								</Badge>
								<Badge variant="outline" className="text-xs">
									{getCategoryIcon(achievement.category)}{' '}
									{achievement.category}
								</Badge>
							</div>

							{/* Footer */}
							<div className="mt-auto pt-3 border-t flex items-center justify-between">
								{/* XP Reward */}
								<div className="flex items-center gap-1 text-sm">
									<Zap className="h-4 w-4 text-yellow-500" />
									<span className="font-semibold">{achievement.xpReward}</span>
									<span className="text-muted-foreground text-xs">XP</span>
								</div>

								{/* Earned Date or Progress */}
								{isEarned && achievement.earnedAt ? (
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										<Clock className="h-3 w-3" />
										<span>{formatRelativeTime(achievement.earnedAt)}</span>
									</div>
								) : achievement.progress !== undefined && achievement.maxProgress ? (
									<div className="flex-1 mr-3">
										<div className="flex items-center justify-between text-xs mb-1">
											<span className="text-muted-foreground">التقدم</span>
											<span className="font-medium">
												{achievement.progress} / {achievement.maxProgress}
											</span>
										</div>
										<div className="h-1.5 bg-secondary rounded-full overflow-hidden">
											<div
												className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
												style={{
													width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
												} as React.CSSProperties}
											/>
										</div>
									</div>
								) : (
									<span className="text-xs text-muted-foreground">غير محرز</span>
								)}
							</div>

							{/* Earned Animation Overlay */}
							{isEarned && (
								<div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
									<motion.div
										initial={{ scale: 0, opacity: 0 }}
										animate={{ scale: 1.5, opacity: [0, 0.3, 0] }}
										transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
										className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
									>
										<Sparkles className="h-20 w-20 text-yellow-400" />
									</motion.div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</motion.div>

			<AchievementModal
				achievement={achievement}
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</>
	);
}


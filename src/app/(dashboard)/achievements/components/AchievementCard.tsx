"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
	EyeOff,
	Sparkles,
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
				duration: 0.4,
					// Framer Motion expects Easing type (not arbitrary string).
						ease: [0.16, 1, 0.3, 1] as const
			},
		}),
		hover: {
			y: -6,
				transition: { duration: 0.2, ease: [0.42, 0, 0.58, 1] as const },
		},
	};

	// Get subtle ring colors based on rarity for the border glow effect
	const getRarityGlow = () => {
		switch (rarity) {
			case 'legendary': return 'from-yellow-400/50 to-orange-500/50 shadow-yellow-500/20';
			case 'epic': return 'from-purple-400/50 to-fuchsia-500/50 shadow-purple-500/20';
			case 'rare': return 'from-blue-400/50 to-cyan-500/50 shadow-blue-500/20';
			default: return 'from-primary/30 to-primary/10 shadow-primary/10';
		}
	};
	
	const getRarityGradientBg = () => {
		if (!isEarned) return '';
		switch (rarity) {
			case 'legendary': return 'bg-gradient-to-br from-yellow-500/5 via-background to-orange-500/10';
			case 'epic': return 'bg-gradient-to-br from-purple-500/5 via-background to-fuchsia-500/10';
			case 'rare': return 'bg-gradient-to-br from-blue-500/5 via-background to-cyan-500/10';
			default: return 'bg-gradient-to-br from-primary/5 via-background to-primary/5';
		}
	};

	return (
		<>
			<motion.div
				variants={cardVariants}
				initial="hidden"
				animate="visible"
				custom={index}
				whileHover="hover"
				className="h-full relative group"
			>
				{/* Glowing backdrop effect only visible when earned */}
				{isEarned && (
					<div className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-br ${getRarityGlow()} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`} />
				)}

				<Card
					className={`h-full cursor-pointer transition-all duration-300 relative z-10 rounded-2xl md:rounded-[22px] border ${
						isEarned
							? `border-primary/20 ${getRarityGradientBg()} shadow-sm`
							: 'border-border/60 bg-card/50 opacity-[0.85] hover:opacity-100 hover:border-border grayscale-[0.2]'
					} overflow-hidden`}
					onClick={() => setIsModalOpen(true)}
				>
					{/* Top shining line */}
					{isEarned && (
						<div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50" />
					)}

					<CardContent className="p-6 h-full flex flex-col">
						{/* Header with Icon and Status */}
						<div className="flex items-start justify-between mb-4">
							<div className="flex items-center gap-4 flex-1">
								<div className="relative">
									{isEarned && (
										<div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
									)}
									<div
										className={`text-5xl relative z-10 transition-transform duration-500 ${
											isEarned ? 'group-hover:scale-110 drop-shadow-md' : 'grayscale opacity-40'
										}`}
									>
										{achievement.icon || getCategoryIcon(achievement.category)}
									</div>
									
									{/* Secret Badge overlapping icon */}
									{achievement.isSecret && !isEarned && (
										<div className="absolute -bottom-2 -right-2 bg-background border p-1 rounded-full text-muted-foreground shadow-sm">
											<EyeOff className="h-4 w-4" />
										</div>
									)}
								</div>
								
								<div className="flex-1 min-w-0 pr-2">
									<h3
										className={`font-bold text-lg mb-1 leading-snug line-clamp-2 ${
											isEarned ? 'text-foreground' : 'text-muted-foreground filter blur-[1px]' // Blur text lightly if secret and not earned
										}`}
										style={{ 
											filter: (achievement.isSecret && !isEarned) ? 'blur(3px)' : 'none',
											userSelect: (achievement.isSecret && !isEarned) ? 'none' : 'auto'
										}}
									>
										{achievement.isSecret && !isEarned ? 'إنجاز سري غير معروف' : achievement.title}
									</h3>
									
									<div className="flex items-center gap-1.5 mt-2">
										<Badge
											variant="secondary"
											className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0 h-5 bg-transparent border ${getDifficultyColor(achievement.difficulty)}`}
										>
											{getDifficultyLabel(achievement.difficulty)}
										</Badge>
										<Badge
											variant="secondary"
											className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0 h-5 bg-transparent border ${getRarityColor(rarity)}`}
										>
											{getRarityLabel(rarity)}
										</Badge>
									</div>
								</div>
							</div>
							
							{/* Status indicator icon top right */}
							<div className={`p-2 rounded-full flex-shrink-0 ${isEarned ? 'bg-yellow-500/10 text-yellow-500' : 'bg-muted text-muted-foreground'}`}>
								{isEarned ? (
									<Trophy className="h-5 w-5" />
								) : (
									<Lock className="h-5 w-5 opacity-70" />
								)}
							</div>
						</div>

						{/* Description Description */}
						{(!achievement.isSecret || isEarned) && (
							<p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1">
								{achievement.description}
							</p>
						)}
						{achievement.isSecret && !isEarned && (
							<p className="text-sm text-primary/70 mb-6 font-medium italic flex-1 flex items-center gap-2">
								<Sparkles className="w-4 h-4" /> العب واستكشف لاكتشاف هذا الإنجاز السري
							</p>
						)}

						{/* Footer Details */}
						<div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
							{/* XP Reward */}
							<div className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md border border-border/50">
								<Zap className="h-3.5 w-3.5 text-yellow-500" />
								<span className="font-bold text-sm leading-none">{achievement.xpReward}</span>
								<span className="text-muted-foreground text-[10px] font-medium leading-none">XP</span>
							</div>

							{/* Progress Bar / Earned Date */}
							{isEarned && achievement.earnedAt ? (
								<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
									<Clock className="h-3.5 w-3.5 opacity-70" />
									<span>{formatRelativeTime(achievement.earnedAt)}</span>
								</div>
							) : achievement.progress !== undefined && achievement.maxProgress && achievement.maxProgress > 0 ? (
								<div className="flex-1 mr-4">
									<div className="flex items-center justify-between text-[11px] font-semibold mb-1.5 px-0.5">
										<span className="text-muted-foreground uppercase tracking-wider">التقدم</span>
										<span className={achievement.progress > 0 ? 'text-primary' : 'text-muted-foreground'}>
											{achievement.progress} / {achievement.maxProgress}
										</span>
									</div>
									<div className="h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner">
										<motion.div
											initial={{ width: 0 }}
											animate={{ width: `${Math.min(100, (achievement.progress / achievement.maxProgress) * 100)}%` }}
											transition={{ duration: 1, ease: "easeOut" }}
											className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
										/>
									</div>
								</div>
							) : (
								<span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-wider">مغلق</span>
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

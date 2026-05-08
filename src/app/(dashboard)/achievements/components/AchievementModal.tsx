"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Achievement, AchievementRarity } from '../types';
import {
	getCategoryIcon,
	getCategoryLabel,
	getDifficultyLabel,
	getDifficultyColor,
	getRarityColor,
	getRarityLabel,
	formatArabicDate,
} from '../utils';
import { Trophy, Lock, Zap, Calendar, Target, Award, Sparkles } from 'lucide-react';
import { m, AnimatePresence } from "framer-motion";

interface AchievementModalProps {
	achievement: Achievement;
	isOpen: boolean;
	onClose: () => void;
}

export function AchievementModal({ achievement, isOpen, onClose }: AchievementModalProps) {
	const isEarned = achievement.isEarned || false;
	const rarity = achievement.rarity || 'common';
	const rarityGlow = getRarityGlow(rarity);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-xl p-0 overflow-hidden border-0 bg-transparent shadow-2xl rounded-[2rem] sm:rounded-[2.5rem]">
				<DialogTitle className="sr-only">{achievement.title}</DialogTitle>
				<DialogDescription className="sr-only">{achievement.description}</DialogDescription>

				<div className="relative bg-card/95 backdrop-blur-3xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
					{/* Modal Header Background */}
					<div className="h-40 sm:h-48 w-full relative overflow-hidden">
						<div className={`absolute inset-0 bg-gradient-to-br ${isEarned ? rarityGlow : 'from-muted to-muted-foreground/30'} opacity-20`} />
						
						{isEarned && (
							<m.div 
								animate={{ 
									rotate: 360,
									scale: [1, 1.2, 1]
								}}
								transition={{ 
									rotate: { duration: 20, repeat: Infinity, ease: "linear" },
									scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
								}}
								className={`absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[conic-gradient(var(--tw-gradient-stops))] ${rarityGlow} opacity-30`}
								style={{ filter: "blur(40px)" }}
							/>
						)}

						{/* Pattern overlay */}
						<div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
					</div>

					{/* Modal Body */}
					<div className="relative pt-16 sm:pt-20 px-6 sm:px-10 pb-8 sm:pb-10 bg-gradient-to-b from-transparent to-background/50">
						<div className="absolute -top-16 sm:-top-20 left-1/2 transform -translate-x-1/2 flex justify-center">
							<AchievementIcon 
								achievement={achievement} 
								isEarned={isEarned} 
								rarityGlow={rarityGlow} 
							/>
						</div>

						<AchievementHeader achievement={achievement} isEarned={isEarned} rarity={rarity} />
						
						<AchievementStats achievement={achievement} isEarned={isEarned} />

						<AchievementRequirements achievement={achievement} isEarned={isEarned} />

						{/* Footer Note Date */}
						{isEarned && achievement.earnedAt && (
							<m.div 
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.7 }}
								className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-500/10 py-3 rounded-xl"
							>
								<Calendar className="w-4 h-4" />
								<span>تم الحصول عليه في {formatArabicDate(achievement.earnedAt)}</span>
							</m.div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// Helper functions and sub-components to reduce complexity

const getRarityGlow = (rarity: AchievementRarity) => {
	switch (rarity) {
		case 'legendary': return 'from-yellow-400 via-orange-500 to-red-500';
		case 'epic': return 'from-purple-400 via-fuchsia-500 to-pink-500';
		case 'rare': return 'from-blue-400 via-cyan-500 to-teal-500';
		default: return 'from-primary/50 via-primary to-primary/50';
	}
};

function AchievementIcon({ achievement, isEarned, rarityGlow }: { achievement: Achievement; isEarned: boolean; rarityGlow: string }) {
	return (
		<m.div
			initial={{ scale: 0, y: 50, rotate: -180 }}
			animate={{ scale: 1, y: 0, rotate: 0 }}
			transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
			className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center shadow-2xl ${
				isEarned ? `bg-gradient-to-br ${rarityGlow}` : 'bg-muted border-[4px] border-background'
			} p-1 relative z-20`}
		>
			<div className="w-full h-full bg-card rounded-full flex items-center justify-center relative overflow-hidden">
				{isEarned && <div className={`absolute inset-0 bg-gradient-to-br ${rarityGlow} opacity-20`} />}
				<span className={`text-6xl sm:text-7xl relative z-10 ${!isEarned && 'grayscale opacity-30'}`}>
					{achievement.icon || getCategoryIcon(achievement.category)}
				</span>
				{isEarned && (
					<m.div
						initial={{ opacity: 0 }}
						animate={{ opacity: [0, 1, 0] }}
						transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
						className="absolute inset-0 bg-white/20"
					/>
				)}
			</div>
			
			{isEarned && (
				<m.div 
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", delay: 0.5 }}
					className="absolute -bottom-2 -right-2 bg-yellow-500 text-white p-2.5 rounded-full shadow-lg border-[3px] border-card z-30"
				>
					<Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
				</m.div>
			)}
		</m.div>
	);
}

function AchievementHeader({ achievement, isEarned, rarity }: { achievement: Achievement; isEarned: boolean; rarity: AchievementRarity }) {
	const isSecretLocked = achievement.isSecret && !isEarned;
	
	return (
		<div className="text-center mt-2 mb-8">
			<m.h2 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className={`text-2xl sm:text-3xl font-black mb-3 ${
					isSecretLocked ? 'filter blur-[5px] select-none text-muted-foreground' : 'text-foreground'
				}`}
			>
				{isSecretLocked ? 'إنجاز سري غير معروف' : achievement.title}
			</m.h2>

			<m.div 
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
				className="flex flex-wrap justify-center gap-2 mb-6"
			>
				<Badge variant="secondary" className={`text-xs font-bold px-3 py-1 ${getDifficultyColor(achievement.difficulty)}`}>
					{getDifficultyLabel(achievement.difficulty)}
				</Badge>
				<Badge variant="secondary" className={`text-xs font-bold px-3 py-1 ${getRarityColor(rarity)}`}>
					{getRarityLabel(rarity)}
				</Badge>
				<Badge variant="outline" className="text-xs font-bold px-3 py-1 bg-background/50">
					{getCategoryIcon(achievement.category)} {getCategoryLabel(achievement.category)}
				</Badge>
			</m.div>

			{!isSecretLocked ? (
				<m.p 
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="text-muted-foreground leading-relaxed max-w-sm mx-auto"
				>
					{achievement.description}
				</m.p>
			) : (
				<m.div 
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="flex flex-col items-center justify-center gap-2 text-primary/70"
				>
					<Sparkles className="w-6 h-6 animate-pulse" />
					<p className="font-medium italic text-sm">استمر في استكشاف المنصة لاكتشاف هذا الإنجاز السري المخبأ!</p>
				</m.div>
			)}
		</div>
	);
}

function AchievementStats({ achievement, isEarned }: { achievement: Achievement; isEarned: boolean }) {
	const hasProgress = achievement.progress !== undefined && achievement.maxProgress;

	return (
		<m.div 
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.5 }}
			className="grid grid-cols-2 gap-4 mb-6"
		>
			<div className="bg-secondary/40 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
				<div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
					<Zap className="w-5 h-5" />
				</div>
				<div className="text-2xl font-black">{achievement.xpReward}</div>
				<div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">مكافأة نقاط XP</div>
			</div>

			{hasProgress ? (
				<div className="bg-secondary/40 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
					<div className="absolute bottom-0 inset-x-0 h-1 bg-secondary">
						<m.div 
							className="h-full bg-primary"
							initial={{ width: 0 }}
							animate={{ width: `${Math.min(100, (achievement.progress! / achievement.maxProgress!) * 100)}%` }}
							transition={{ duration: 1, delay: 0.8 }}
						/>
					</div>
					<div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
						<Target className="w-5 h-5" />
					</div>
					<div className="text-2xl font-black">
						{achievement.progress} <span className="text-sm font-medium text-muted-foreground">/ {achievement.maxProgress}</span>
					</div>
					<div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">نسبة التقدم</div>
				</div>
			) : (
				<div className="bg-secondary/40 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
					<div className={`p-2 rounded-xl ${isEarned ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
						{isEarned ? <Trophy className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
					</div>
					<div className={`text-lg font-bold ${isEarned ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
						{isEarned ? 'مكتسب' : 'مغلق'}
					</div>
					<div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">الحالة الحالية</div>
				</div>
			)}
		</m.div>
	);
}

function AchievementRequirements({ achievement, isEarned }: { achievement: Achievement; isEarned: boolean }) {
	const showRequirements = Object.keys(achievement.requirements).length > 0 && (!achievement.isSecret || isEarned);

	return (
		<AnimatePresence>
			{showRequirements && (
				<m.div 
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					transition={{ delay: 0.6 }}
					className="mb-6 bg-card border rounded-2xl overflow-hidden"
				>
					<div className="px-5 py-3 border-b bg-muted/40 font-semibold flex items-center gap-2 text-sm">
						<Award className="w-4 h-4 text-primary" />
						متطلبات الإنجاز
					</div>
					<div className="divide-y">
						{Object.entries(achievement.requirements).map(([key, value]) => (
							<div key={key} className="flex items-center justify-between p-4 text-sm hover:bg-muted/20 transition-colors">
								<span className="text-muted-foreground font-medium">{key}</span>
								<span className="font-bold bg-secondary px-2.5 py-1 rounded-md">{String(value)}</span>
							</div>
						))}
					</div>
				</m.div>
			)}
		</AnimatePresence>
	);
}


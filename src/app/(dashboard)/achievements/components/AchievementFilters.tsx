"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { AchievementFilters as FiltersType, AchievementCategory, AchievementDifficulty, SortOption } from '../types';
import { getCategoryLabel, getDifficultyLabel } from '../utils';
import { Search, X, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AchievementFiltersProps {
	filters: FiltersType;
	onFiltersChange: (filters: Partial<FiltersType>) => void;
}

export function AchievementFilters({ filters, onFiltersChange }: AchievementFiltersProps) {
	const [showFilters, setShowFilters] = useState(false);

	const activeFiltersCount = 
		(filters.category !== 'all' ? 1 : 0) + 
		(filters.difficulty !== 'all' ? 1 : 0) + 
		(filters.sortBy !== 'earnedAt' ? 1 : 0);

	return (
		<Card className="border-0 shadow-xl bg-card/80 backdrop-blur-2xl rounded-[1.5rem] overflow-hidden sticky top-24 z-30 ring-1 ring-border/50">
			<CardContent className="p-5">
				<div className="flex flex-col gap-5">
					{/* Header */}
					<div className="flex items-center justify-between">
						<h3 className="font-bold flex items-center gap-2">
							<Filter className="w-4 h-4 text-primary" />
							تصفية الإنجازات
						</h3>
						{activeFiltersCount > 0 && (
							<span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
								{activeFiltersCount}
							</span>
						)}
					</div>

					{/* Search Bar */}
					<div className="relative group">
						<Search className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
						<Input
							type="text"
							placeholder="البحث بالاسم أو الوصف..."
							value={filters.search}
							onChange={(e) => onFiltersChange({ search: e.target.value })}
							className="pr-10 bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:ring-primary rounded-xl transition-all h-11"
						/>
						{filters.search && (
							<button
								onClick={() => onFiltersChange({ search: '' })}
								className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-muted p-1 rounded-full hover:bg-muted-foreground/20 transition-colors"
								aria-label="مسح البحث"
							>
								<X className="h-3 w-3 text-foreground" />
							</button>
						)}
					</div>

					{/* Status Toggle Buttons */}
					<div className="bg-secondary/40 p-1.5 rounded-xl flex gap-1">
						{['all', 'earned', 'locked'].map((status) => (
							<button
								key={status}
								onClick={() => onFiltersChange({ status: status as any })}
								className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 relative ${
									filters.status === status
										? 'text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground hover:bg-background/40'
								}`}
							>
								{filters.status === status && (
									<motion.div
										layoutId="status-bg"
										className="absolute inset-0 bg-background rounded-lg shadow-sm"
										initial={false}
										transition={{ type: "spring", stiffness: 300, damping: 30 }}
									/>
								)}
								<span className="relative z-10">
									{status === 'all' ? 'الكل' : status === 'earned' ? 'مكتسبة' : 'مقفلة'}
								</span>
							</button>
						))}
					</div>

					{/* Advanced Filters Toggle */}
					<Button
						variant="ghost"
						onClick={() => setShowFilters(!showFilters)}
						className="w-full justify-between h-11 font-semibold rounded-xl bg-secondary/20 hover:bg-secondary/60"
					>
						<span className="flex items-center gap-2">
							<SlidersHorizontal className="h-4 w-4" />
							فلاتر متقدمة
						</span>
						<motion.div
							animate={{ rotate: showFilters ? 180 : 0 }}
							transition={{ duration: 0.3 }}
						>
							<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
						</motion.div>
					</Button>

					{/* Advanced Filters Content */}
					<AnimatePresence>
						{showFilters && (
							<motion.div 
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.3, ease: "easeInOut" }}
								className="overflow-hidden"
							>
								<div className="flex flex-col gap-4 pt-2 pb-1">
									{/* Category Filter */}
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1 block">الفئة</label>
										<Select
											value={filters.category}
											onValueChange={(value) =>
												onFiltersChange({ category: value as AchievementCategory | 'all' })
											}
										>
											<SelectTrigger className="h-11 rounded-xl bg-secondary/30">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												<SelectItem value="all" className="font-medium">جميع الفئات</SelectItem>
												{(['study', 'tasks', 'exams', 'time', 'streak'] as AchievementCategory[]).map(
													(category) => (
														<SelectItem key={category} value={category} className="font-medium">
															{getCategoryLabel(category)}
														</SelectItem>
													)
												)}
											</SelectContent>
										</Select>
									</div>

									{/* Difficulty Filter */}
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1 block">مستوى الصعوبة</label>
										<Select
											value={filters.difficulty}
											onValueChange={(value) =>
												onFiltersChange({ difficulty: value as AchievementDifficulty | 'all' })
											}
										>
											<SelectTrigger className="h-11 rounded-xl bg-secondary/30">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												<SelectItem value="all" className="font-medium">كل المستويات</SelectItem>
												{(['easy', 'medium', 'hard', 'expert'] as AchievementDifficulty[]).map(
													(difficulty) => (
														<SelectItem key={difficulty} value={difficulty} className="font-medium">
															{getDifficultyLabel(difficulty)}
														</SelectItem>
													)
												)}
											</SelectContent>
										</Select>
									</div>

									{/* Sort Filter */}
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1 block">ترتيب النتائج</label>
										<Select
											value={filters.sortBy}
											onValueChange={(value) => onFiltersChange({ sortBy: value as SortOption })}
										>
											<SelectTrigger className="h-11 rounded-xl bg-secondary/30">
												<div className="flex items-center gap-2">
													<ArrowUpDown className="h-4 w-4 text-muted-foreground" />
													<SelectValue />
												</div>
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												<SelectItem value="earnedAt" className="font-medium">تاريخ الحصول (الأحدث أولاً)</SelectItem>
												<SelectItem value="title" className="font-medium">أبجديًا (الاسم)</SelectItem>
												<SelectItem value="xpReward" className="font-medium">حسب نقاط XP (الأعلى)</SelectItem>
												<SelectItem value="difficulty" className="font-medium">الصعوبة (الأصعب أولاً)</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Reset Button */}
									{activeFiltersCount > 0 && (
										<Button 
											variant="ghost" 
											className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-bold"
											onClick={() => onFiltersChange({ category: 'all', difficulty: 'all', sortBy: 'earnedAt' })}
										>
											إعادة ضبط الفلاتر المتقدمة
										</Button>
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</CardContent>
		</Card>
	);
}

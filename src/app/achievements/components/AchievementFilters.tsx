"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/shared/card';
import { Button } from '@/shared/button';
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
import { Search, X, Filter } from 'lucide-react';

interface AchievementFiltersProps {
	filters: FiltersType;
	onFiltersChange: (filters: Partial<FiltersType>) => void;
}

export function AchievementFilters({ filters, onFiltersChange }: AchievementFiltersProps) {
	const [showFilters, setShowFilters] = useState(false);

	return (
		<Card className="mb-6">
			<CardContent className="p-4">
				<div className="flex flex-col gap-4">
					{/* Search Bar */}
					<div className="relative">
						<Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="ابحث في الإنجازات..."
							value={filters.search}
							onChange={(e) => onFiltersChange({ search: e.target.value })}
							className="pr-10"
						/>
						{filters.search && (
							<button
								onClick={() => onFiltersChange({ search: '' })}
								className="absolute left-3 top-1/2 transform -translate-y-1/2"
								aria-label="مسح البحث"
								title="مسح البحث"
							>
								<X className="h-4 w-4 text-muted-foreground" />
							</button>
						)}
					</div>

					{/* Quick Filters */}
					<div className="flex flex-wrap gap-2">
						<Button
							variant={filters.status === 'all' ? 'default' : 'outline'}
							size="sm"
							onClick={() => onFiltersChange({ status: 'all' })}
						>
							الكل
						</Button>
						<Button
							variant={filters.status === 'earned' ? 'default' : 'outline'}
							size="sm"
							onClick={() => onFiltersChange({ status: 'earned' })}
						>
							المكتسبة
						</Button>
						<Button
							variant={filters.status === 'locked' ? 'default' : 'outline'}
							size="sm"
							onClick={() => onFiltersChange({ status: 'locked' })}
						>
							المقفلة
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowFilters(!showFilters)}
							className="mr-auto"
						>
							<Filter className="h-4 w-4 ml-2" />
							فلترة متقدمة
						</Button>
					</div>

					{/* Advanced Filters */}
					{showFilters && (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
							{/* Category Filter */}
							<div>
								<label className="text-sm font-medium mb-2 block">الفئة</label>
								<Select
									value={filters.category}
									onValueChange={(value) =>
										onFiltersChange({ category: value as AchievementCategory | 'all' })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">الكل</SelectItem>
										{(['study', 'tasks', 'exams', 'time', 'streak'] as AchievementCategory[]).map(
											(category) => (
												<SelectItem key={category} value={category}>
													{getCategoryLabel(category)}
												</SelectItem>
											)
										)}
									</SelectContent>
								</Select>
							</div>

							{/* Difficulty Filter */}
							<div>
								<label className="text-sm font-medium mb-2 block">الصعوبة</label>
								<Select
									value={filters.difficulty}
									onValueChange={(value) =>
										onFiltersChange({ difficulty: value as AchievementDifficulty | 'all' })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">الكل</SelectItem>
										{(['easy', 'medium', 'hard', 'expert'] as AchievementDifficulty[]).map(
											(difficulty) => (
												<SelectItem key={difficulty} value={difficulty}>
													{getDifficultyLabel(difficulty)}
												</SelectItem>
											)
										)}
									</SelectContent>
								</Select>
							</div>

							{/* Sort Filter */}
							<div>
								<label className="text-sm font-medium mb-2 block">ترتيب حسب</label>
								<Select
									value={filters.sortBy}
									onValueChange={(value) => onFiltersChange({ sortBy: value as SortOption })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="earnedAt">تاريخ الحصول</SelectItem>
										<SelectItem value="title">الاسم</SelectItem>
										<SelectItem value="xpReward">النقاط</SelectItem>
										<SelectItem value="difficulty">الصعوبة</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}


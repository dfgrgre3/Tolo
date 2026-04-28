import { TimeStats } from '../types';

interface GameMetrics {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  progressPercentage: number;
  rank: string;
}

export function calculateGameMetrics(stats: TimeStats): GameMetrics {
  // Use the pre-calculated values from useTimeStats if available
  // Fallback to legacy calculation if needed
  
  const level = stats.level || 1;
  const currentXP = stats.xp || 0;
  const xpForNextLevel = stats.nextLevelXp || 1000;
  const progressPercentage = (currentXP / xpForNextLevel) * 100;
  const rank = stats.rank || "مبتدئ";

  return {
    level,
    currentXP,
    xpForNextLevel,
    progressPercentage,
    rank
  };
}

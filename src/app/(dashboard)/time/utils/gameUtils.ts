import { TimeStats } from '../types';

export interface GameMetrics {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  progressPercentage: number;
  rank: string;
}

export function calculateGameMetrics(stats: TimeStats): GameMetrics {
  // Base XP on meaningful actions
  // 1 study hour = 50 XP
  // 1 completed task = 25 XP
  // 1 pomodoro session = 10 XP
  // Streak days multiplier (up to 1.5x)
  
  const baseXP = 
    (stats.studyHours * 50) + 
    (stats.completedTasks * 25) + 
    (stats.pomodoroSessions * 10);
    
  const streakMultiplier = 1 + Math.min(stats.streakDays * 0.05, 0.5); // max 1.5x
  const totalXP = Math.floor(baseXP * streakMultiplier);

  // Level curve: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 250 XP, Level 4 = 450 XP, etc.
  // Formula: XP = 50 * (Level - 1)^1.5 + 50 * (Level - 1)
  
  let currentLevel = 1;
  let xpForNext = 100;
  let accumulatedXPToNext = 100;

  // Simple step calculation for levels
  while (totalXP >= accumulatedXPToNext) {
    currentLevel++;
    xpForNext = Math.floor(50 * Math.pow(currentLevel, 1.5));
    accumulatedXPToNext += xpForNext;
  }

  const xpInCurrentLevel = totalXP - (accumulatedXPToNext - xpForNext);
  const progressPercentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpForNext) * 100));

  let rank = "مبتدئ التنظيم";
  if (currentLevel >= 5) rank = "متدرب واعد";
  if (currentLevel >= 10) rank = "منظم محترف";
  if (currentLevel >= 20) rank = "سيد الوقت";
  if (currentLevel >= 50) rank = "أسطورة الإنتاجية";

  return {
    level: currentLevel,
    currentXP: totalXP,
    xpForNextLevel: xpForNext,
    progressPercentage,
    rank
  };
}

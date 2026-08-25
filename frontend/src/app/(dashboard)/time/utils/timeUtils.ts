/**
 * Utility functions for time management calculations
 */

/**
 * Format seconds to MM:SS format
 */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate focus score based on pomodoro count and time spent
 */
export function calculateFocusScore(pomodoroCount: number, minutesPerSession: number = 25): number {
  // Base score is 10 points per completed pomodoro
  const baseScore = pomodoroCount * 10;

  // Bonus for consistency - extra points if maintaining regular schedule
  const consistencyBonus = pomodoroCount > 5 ? 10 : pomodoroCount * 2;

  // Adjust based on session length (perfect score for 25min sessions)
  const lengthAdjustment = Math.min(1.2, Math.max(0.8, minutesPerSession / 25));

  // Total score with cap at 100
  const totalScore = Math.min(100, baseScore * lengthAdjustment + consistencyBonus);

  return Math.round(totalScore);
}

/**
 * Calculate discipline score based on task completion rate and consistency
 */
export function calculateDisciplineScore(completedTasks: number, totalTasks: number, streakDays: number): number {
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Weighted score: 50% completion rate, 30% streak consistency, 20% task management
  const disciplineScore = (completionRate * 0.5) +
                         Math.min(100, (streakDays / 30) * 100 * 0.3) +
                         Math.min(100, (completedTasks / Math.max(1, totalTasks)) * 100 * 0.2);

  return Math.min(100, Math.round(disciplineScore));
}

/**
 * Calculate mastery score based on study efficiency and focus
 */
export function calculateMasteryScore(
  completionRate: number,
  pomodoroRatio: number,
  dailyGoalProgress: number
): number {
  // Weighted score: 50% completion rate, 30% focused study ratio, 20% daily goal achievement
  const masteryScore = (completionRate * 0.5) +
                      (pomodoroRatio * 100 * 0.3) +
                      (dailyGoalProgress * 0.2);

  return Math.min(100, Math.round(masteryScore));
}

/**
 * Calculate study efficiency based on actual vs planned time
 */
export function calculateStudyEfficiency(actualTime: number, estimatedTime: number): number {
  if (estimatedTime <= 0) return 0;

  // Efficiency is based on how close actual time is to estimated time
  // Perfect efficiency when actual equals estimated time (100%)
  // Lower efficiency when taking significantly more or less time than estimated
  const efficiencyRatio = actualTime / estimatedTime;

  // Score based on proximity to 1.0 (perfect efficiency)
  // Using a bell curve-like approach where scores decrease as you move away from 1.0
  const distanceFromIdeal = Math.abs(1.0 - efficiencyRatio);
  const efficiencyScore = Math.max(0, 100 - (distanceFromIdeal * 50));

  return Math.min(100, Math.round(efficiencyScore));
}

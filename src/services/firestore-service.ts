
import { logger } from '@/lib/logger';

export interface FirestoreUserProgress {
  userId: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  achievements: string[];
}

export interface FirestoreLeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  rank: number;
  avatar?: string;
}

export const firestoreService = {
  async updateUserProgress(userId: string, _progress: any) {
    logger.info(`Firestore: Updating progress for user ${userId}`);
    return true;
  },

  async sendAchievementNotification(userId: string, achievement: any) {
    logger.info(`Firestore: Sending achievement notification to ${userId}: ${achievement.title}`);
    return true;
  },

  async logEvent(name: string, data: any) {
    logger.info(`Firestore Event: ${name}`, data);
    return true;
  },

  async subscribeToUserProgress(_userId: string, _callback: (progress: FirestoreUserProgress) => void) {
    return () => { };
  },

  async subscribeToLeaderboard(_type: string, _limit: number, _callback: (entries: FirestoreLeaderboardEntry[]) => void) {
    return () => { };
  },

  async subscribeToAchievementNotifications(_userId: string, _callback: (entry: any) => void) {
    return () => { };
  },

  cleanupListener(_id: string) { }
};

export default firestoreService;

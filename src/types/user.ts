import { UserRole } from './enums';

export interface User {
    id: string;
    email: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    role: UserRole;
    phone?: string | null;
    phoneVerified: boolean;
    emailVerified: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    lastLogin?: Date | string | null;
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;

    // Gamification
    totalXP: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    totalStudyTime: number;
    tasksCompleted: number;
    examsPassed: number;
    pomodoroSessions: number;
    deepWorkSessions: number;

    // Multi-layer points system
    studyXP: number;
    taskXP: number;
    examXP: number;
    challengeXP: number;
    questXP: number;
    seasonXP: number;

    [key: string]: any;
}

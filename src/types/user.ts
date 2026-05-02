import { UserRole, UserStatus } from './enums';

export interface User {
    id: string;
    email: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    role: UserRole;
    status: UserStatus;
    phone?: string | null;
    phoneVerified: boolean;
    emailVerified: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    lastLogin?: Date | string | null;
    twoFactorEnabled: boolean;

    // Billing & Subscriptions
    balance: number;
    aiCredits: number;
    examCredits: number;
    activeSubscriptionId?: string | null;
    subscriptionExpiresAt?: Date | string | null;

    // Access Control
    permissions: string[];

    // Gamification (core)
    totalXP: number;
    level: number;

    // Gamification (stats)
    currentStreak: number;
    longestStreak: number;
    totalStudyTime: number;
    tasksCompleted: number;
    examsPassed: number;

    // Multi-layer XP system
    studyXP: number;
    taskXP: number;
    examXP: number;
    challengeXP: number;
    questXP: number;
    seasonXP: number;

    [key: string]: unknown;
}

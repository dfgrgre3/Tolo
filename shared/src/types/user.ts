import { UserRole, UserStatus } from './enums';

/**
 * User type — synced with backend `internal/models/user.go`
 */
export interface User {
    // Core identity
    id: string;
    email: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    role: UserRole;
    status: UserStatus;

    // Contact & verification
    phone?: string | null;
    phoneVerified: boolean;
    emailVerified: boolean;
    alternativePhone?: string | null;

    // Profile
    country?: string | null;
    gradeLevel?: string | null;
    educationType?: string | null;
    section?: string | null;
    bio?: string | null;
    dateOfBirth?: string | null;

    // Study preferences
    wakeUpTime?: string | null;
    sleepTime?: string | null;
    focusStrategy: string;
    studyGoal?: string | null;
    interestedSubjects: string[];
    subjectsTaught?: string[];
    classesTaught?: string[];
    experienceYears?: string | null;

    // Notifications
    emailNotifications: boolean;
    smsNotifications: boolean;

    // Billing & Subscriptions
    balance: number;
    aiCredits: number;
    examCredits: number;
    additionalAiCredits?: number;
    additionalExamCredits?: number;
    activeSubscriptionId?: string | null;
    subscriptionExpiresAt?: string | null;

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

    // Security
    twoFactorEnabled: boolean;
    biometricEnabled?: boolean;
    googleId?: string | null;
    githubId?: string | null;
    referralCode?: string | null;

    // Timestamps
    createdAt: string;
    updatedAt: string;
    lastLogin?: string | null;

    [key: string]: unknown;
}

/** Minimal user object for nested relations */
export interface UserSummary {
    id: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    role: UserRole;
}

/** Profile update payload — PATCH /api/auth/profile */
export interface UpdateProfilePayload {
    name?: string;
    username?: string;
    phone?: string;
    country?: string;
    gradeLevel?: string;
    educationType?: string;
    section?: string;
    bio?: string;
    dateOfBirth?: string;
    wakeUpTime?: string;
    sleepTime?: string;
    focusStrategy?: string;
    studyGoal?: string;
    interestedSubjects?: string[];
    emailNotifications?: boolean;
    smsNotifications?: boolean;
}

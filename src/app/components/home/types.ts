import type { User as BaseUser } from '@/types/user';
import type { ReactNode } from 'react';

// --- User Types ---
interface GamifiedUser extends BaseUser {
    dailyStreak?: number;
    maxStreak?: number;
    gems?: number;
    class?: string; // e.g., "Warrior", "Mage"
    currentTitle?: string;
}

// --- Shared Props ---
interface SectionProps {
    user?: GamifiedUser | null;
    className?: string;
}

export interface StatCardProps {
    icon: ReactNode;
    value: string | number;
    label: string;
    color: string; // Tailwind gradient classes or specific color key
    delay?: number;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

// --- Feature Section Types ---
export interface FeatureItem {
    icon: ReactNode;
    title: string;
    description: string;
    delay?: number;
    badge?: string;
    link?: string;
    color?: string; // Specific color for the icon override
}

// --- Exam/Subject Types ---
type Difficulty = "سهل" | "متوسط" | "صعب";

export interface Exam {
    id: string;
    title: string;
    duration: number;
    questionCount: number;
    difficulty: Difficulty;
    subject?: string;
    year?: number;
    type?: string;
    xpReward?: number;
    isCompleted?: boolean;
}

export interface SubjectWithExams {
    id: string;
    name: string;
    emoji: string;
    exams: Exam[];
}

// --- Performance Types ---
export type MetricStatus = "excellent" | "good" | "warning" | "critical";
type MetricTrend = "up" | "down" | "stable";

export interface PerformanceMetric {
    name: string;
    rpgName: string;
    value: number;
    target: number;
    unit: string;
    trend: MetricTrend;
    status: MetricStatus;
    icon?: ReactNode;
    description?: string;
}

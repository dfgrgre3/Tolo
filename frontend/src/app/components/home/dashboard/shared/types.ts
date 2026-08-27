import type { ReactElement } from 'react';

export interface StatCardProps {
    icon: ReactElement<{ className?: string }>;
    value: string | number;
    label: string;
    color: string; // Tailwind gradient classes or specific color key
    delay?: number;
    trend?: {
        value: number;
        isPositive: boolean;
    };
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

/** Mirrors PerformanceMetricReadModel from GET /api/analytics/performance. */
export interface PerformanceMetric {
    name: string;
    rpgName: string;
    value: number;
    target: number;
    unit: string;
    trend: MetricTrend;
    status: MetricStatus;
    description: string;
    hasData: boolean;
}

/** Mirrors MilestoneReadModel from GET /api/analytics/predictions. */
export interface Milestone {
    date: string;
    goal: string;
    status: "upcoming" | "current" | "achieved";
}

/** Mirrors PredictionReadModel from GET /api/analytics/predictions. */
export interface Prediction {
    period: string;
    predictedScore: number;
    confidence: number;
    milestones: Milestone[];
    recommendations: string[];
}

/** Mirrors RecommendationReadModel from GET /api/recommendations. */
export interface Recommendation {
    id: string;
    type: "study_plan" | "task" | "resource" | "tip" | "exam_prep";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    impact: number;
    estimatedTime: string;
    category: string;
    icon: string;
    actionUrl: string;
}

/** Mirrors TipReadModel from GET /api/tips. */
export interface Tip {
    id: string;
    title: string;
    description: string;
    icon: string;
    href: string;
    action: string;
    color: string;
}

/** Mirrors CourseProgressReadModel from GET /api/users/progress/courses. */
export interface CourseProgress {
    id: string;
    enrollmentId: string;
    title: string;
    thumbnailUrl: string;
    progress: number;
    totalLessons: number;
    doneLessons: number;
    enrolledAt: string;
    lastAccessedAt: string;
}

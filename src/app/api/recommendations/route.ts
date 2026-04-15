import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { gamificationService } from '@/services/gamification-service';
import { startOfWeek, endOfWeek, subDays, startOfDay, differenceInDays } from 'date-fns';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import { TaskStatus } from '@/lib/constants';

/**
 * GET /api/recommendations
 * Get AI-powered personalized recommendations based on user's actual data
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Try to get userId from query params first (for backward compatibility)
      const { searchParams } = new URL(req.url);
      let userId = searchParams.get('userId');

      // If not in query params, try to get from authenticated user
      if (!userId) {
        userId = req.headers.get("x-user-id");
      }

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required', recommendations: [] },
          { status: 400 }
        );
      }

      // Fetch user's actual data with optimized queries
      const [
        user,
        studySessions,
        tasks,
        examResults,
        progress
      ] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.studySession.findMany({
          where: { userId },
          orderBy: { startTime: 'desc' },
          take: 50,
          select: {
            id: true,
            subjectId: true,
            startTime: true,
            endTime: true,
            durationMin: true,
            focusScore: true,
          }
        }),
        prisma.task.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            title: true,
            status: true,
            dueAt: true,
            priority: true,
            subjectId: true,
          }
        }),
        prisma.examResult.findMany({
          where: { userId },
          select: {
            id: true,
            score: true,
            takenAt: true,
            exam: {
              select: {
                title: true,
                subjectId: true,
              }
            }
          },
          orderBy: { takenAt: 'desc' },
          take: 20
        }),
        gamificationService.getUserProgress(userId).catch(() => null)
      ]);

      // Use examResults for both variables (was duplicated before)
      const userGrades = examResults;

      if (!user) {
        return NextResponse.json(
          { error: 'User not found', recommendations: [] },
          { status: 404 }
        );
      }

      const recommendations = generateRecommendations({
        user,
        studySessions,
        tasks: tasks as any,
        examResults,
        userGrades,
        progress: progress ? {
          totalStudyMinutes: 0,
          averageFocusScore: 0,
          currentStreak: progress.currentStreak
        } : null
      });

      return NextResponse.json({
        success: true,
        recommendations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching recommendations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations', recommendations: [] },
        { status: 500 }
      );
    }
  });
}

interface RecommendationData {
  user: Prisma.UserGetPayload<{ select: { id: true; email: true; name: true } }> | null;
  studySessions: { id: string; subjectId: string | null; startTime: Date; endTime: Date; durationMin: number; focusScore: number }[];
  tasks: { id: string; title: string; status: TaskStatus; dueAt: Date | null; priority: number; subjectId: string | null }[];
  examResults: { id: string; score: number; takenAt: Date; exam: { title: string; subjectId: string } | null }[];
  userGrades: { id: string; score: number; takenAt: Date; exam: { title: string; subjectId: string } | null }[];
  progress: { totalStudyMinutes: number; averageFocusScore: number; currentStreak?: number } | null;
}

interface Recommendation {
  id?: string;
  type: string;
  category?: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact?: number;
  estimatedTime?: string;
  icon?: string;
  actionUrl?: string;
}

function generateRecommendations(data: RecommendationData): Recommendation[] {
  const { user, studySessions, tasks, examResults, userGrades, progress } = data;
  const recommendations: Recommendation[] = [];

  // 1. Study Time Analysis
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 6 });
  const weekSessions = studySessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    return sessionDate >= weekStart && sessionDate <= weekEnd;
  });
  const weeklyMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  const weeklyHours = weeklyMinutes / 60;

  // Calculate average daily study time
  const last7Days = studySessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    return sessionDate >= subDays(new Date(), 7);
  });
  const avgDailyMinutes = last7Days.length > 0
    ? last7Days.reduce((sum, s) => sum + (s.durationMin || 0), 0) / 7
    : 0;

  // Study plan recommendations
  if (weeklyHours < 10) {
    const targetHours = 10;
    const deficit = targetHours - weeklyHours;
    recommendations.push({
      id: `study_plan_weekly_${Date.now()}`,
      type: "study_plan",
      category: "study_plan",
      title: "ط²ظٹط§ط¯ط© ظˆظ‚طھ ط§ظ„ط¯ط±ط§ط³ط© ط§ظ„ط£ط³ط¨ظˆط¹ظٹ",
      description: `ط£ظ†طھ طھط¯ط±ط³ ط­ط§ظ„ظٹط§ظ‹ ${weeklyHours.toFixed(1)} ط³ط§ط¹ط© ط£ط³ط¨ظˆط¹ظٹط§ظ‹. ظ†ظˆطµظٹ ط¨ط²ظٹط§ط¯ط© ط§ظ„ظˆظ‚طھ ط¥ظ„ظ‰ ${targetHours} ط³ط§ط¹ط© ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ ظ„طھط­ظ‚ظٹظ‚ ط£ظ‡ط¯ط§ظپظƒ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©.`,
      priority: "high",
      impact: Math.min(95, 60 + Math.floor(deficit * 5)),
      estimatedTime: `${Math.ceil(deficit * 60)} ط¯ظ‚ظٹظ‚ط©`,
      icon: "target",
      actionUrl: "/schedule"
    });
  }

  // 2. Subject Balance Analysis
  const subjectStats: Record<string, { minutes: number; count: number }> = {};
  studySessions.forEach(session => {
    const subject = session.subjectId || 'ط؛ظٹط± ظ…ط­ط¯ط¯';
    if (!subjectStats[subject]) {
      subjectStats[subject] = { minutes: 0, count: 0 };
    }
    subjectStats[subject].minutes += session.durationMin || 0;
    subjectStats[subject].count += 1;
  });


  const totalSubjectMinutes = Object.values(subjectStats).reduce((sum, stat) => sum + stat.minutes, 0);
  const avgMinutesPerSubject = totalSubjectMinutes / Math.max(Object.keys(subjectStats).length, 1);

  // Find subjects with low study time
  Object.entries(subjectStats).forEach(([subject, stats]) => {
    if (stats.minutes < avgMinutesPerSubject * 0.5 && stats.minutes > 0) {
      recommendations.push({
        id: `study_plan_${subject}_${Date.now()}`,
        type: "study_plan",
        category: "study_plan",
        title: `ط²ظٹط§ط¯ط© ظˆظ‚طھ ط§ظ„ط¯ط±ط§ط³ط© ظپظٹ ${subject}`,
        description: `ط£ظ†طھ طھط¯ط±ط³ ${subject} ط£ظ‚ظ„ ظ…ظ† ط§ظ„ظ…طھظˆط³ط·. ظ†ظˆطµظٹ ط¨طھط®طµظٹطµ ظˆظ‚طھ ط£ظƒط«ط± ظ„ظ‡ط°ظ‡ ط§ظ„ظ…ط§ط¯ط© ظ„طھط­ط³ظٹظ† ط§ظ„طھظˆط§ط²ظ†.`,
        priority: "medium",
        impact: 75,
        estimatedTime: `${Math.ceil((avgMinutesPerSubject - stats.minutes) / 60)} ط³ط§ط¹ط©`,
        icon: "book-open",
        actionUrl: `/schedule?subject=${encodeURIComponent(subject)}`
      });
    }
  });

  // 3. Task Completion Analysis
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS);
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  if (pendingTasks.length > 0 && completionRate < 70) {
    const overdueTasks = pendingTasks.filter(t => {
      if (!t.dueAt) return false;
      return new Date(t.dueAt) < new Date();
    });

    if (overdueTasks.length > 0) {
      recommendations.push({
        id: `task_overdue_${Date.now()}`,
        type: "task",
        category: "task",
        title: `${overdueTasks.length} ظ…ظ‡ظ…ط© ظ…طھط£ط®ط±ط©`,
        description: `ظ„ط¯ظٹظƒ ${overdueTasks.length} ظ…ظ‡ظ…ط© طھط¬ط§ظˆط²طھ ظ…ظˆط¹ط¯ظ‡ط§. ظ†ظˆطµظٹ ط¨ظ…ط±ط§ط¬ط¹طھظ‡ط§ ظˆط¥ظƒظ…ط§ظ„ظ‡ط§ ظپظٹ ط£ظ‚ط±ط¨ ظˆظ‚طھ.`,
        priority: "high",
        impact: 90,
        estimatedTime: `${overdueTasks.length * 30} ط¯ظ‚ظٹظ‚ط©`,
        icon: "clock",
        actionUrl: "/tasks?filter=overdue"
      });
    } else {
      recommendations.push({
        id: `task_pending_${Date.now()}`,
        type: "task",
        category: "task",
        title: `ط¥ظƒظ…ط§ظ„ ${pendingTasks.length} ظ…ظ‡ظ…ط© ظ…ط¹ظ„ظ‚ط©`,
        description: `ظ„ط¯ظٹظƒ ${pendingTasks.length} ظ…ظ‡ظ…ط© ظ…ط¹ظ„ظ‚ط©. ظ…ط¹ط¯ظ„ ط§ظ„ط¥ظƒظ…ط§ظ„ ط§ظ„ط­ط§ظ„ظٹ ${completionRate.toFixed(0)}%. ظ†ظˆطµظٹ ط¨طھط­ط³ظٹظ† ظ‡ط°ط§ ط§ظ„ظ…ط¹ط¯ظ„.`,
        priority: "medium",
        impact: 80,
        estimatedTime: `${pendingTasks.length * 25} ط¯ظ‚ظٹظ‚ط©`,
        icon: "check-circle-2",
        actionUrl: "/tasks"
      });
    }
  }

  // 4. Exam Performance Analysis
  if (examResults.length > 0) {
    const avgScore = examResults.reduce((sum, r) => sum + r.score, 0) / examResults.length;
    const lowScores = examResults.filter(r => r.score < 60);

    if (avgScore < 70) {
      recommendations.push({
        id: `exam_prep_average_${Date.now()}`,
        type: "exam_prep",
        category: "exam_prep",
        title: "طھط­ط³ظٹظ† ط§ظ„ط£ط¯ط§ط، ظپظٹ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ",
        description: `ظ…طھظˆط³ط· ط¯ط±ط¬ط§طھظƒ ${avgScore.toFixed(0)}%. ظ†ظˆطµظٹ ط¨ظ…ط±ط§ط¬ط¹ط© ط§ظ„ظ…ظˆط§ط¯ ط§ظ„طھظٹ ط­طµظ„طھ ظپظٹظ‡ط§ ط¹ظ„ظ‰ ط¯ط±ط¬ط§طھ ظ…ظ†ط®ظپط¶ط© ظˆط§ظ„طھط­ط¶ظٹط± ط¨ط´ظƒظ„ ط£ظپط¶ظ„ ظ„ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ظ‚ط§ط¯ظ…ط©.`,
        priority: "high",
        impact: 85,
        estimatedTime: "60 ط¯ظ‚ظٹظ‚ط©",
        icon: "target",
        actionUrl: "/exams"
      });
    }

    // Subject-specific recommendations based on grades
    const subjectScores: Record<string, number[]> = {};
    userGrades.forEach(result => {
      const subject = result.exam?.subjectId || 'ط؛ظٹط± ظ…ط­ط¯ط¯';
      if (!subjectScores[subject]) {
        subjectScores[subject] = [];
      }
      subjectScores[subject].push(result.score);
    });

    Object.entries(subjectScores).forEach(([subject, scores]) => {
      const avgSubjectScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      if (avgSubjectScore < 65) {
        recommendations.push({
          id: `exam_prep_${subject}_${Date.now()}`,
          type: "exam_prep",
          category: "exam_prep",
          title: `طھط­ط³ظٹظ† ط§ظ„ط£ط¯ط§ط، ظپظٹ ${subject}`,
          description: `ظ…طھظˆط³ط· ط¯ط±ط¬ط§طھظƒ ظپظٹ ${subject} ظ‡ظˆ ${avgSubjectScore.toFixed(0)}%. ظ†ظˆطµظٹ ط¨ظ…ط±ط§ط¬ط¹ط© ط´ط§ظ…ظ„ط© ظ„ظ„ظ…ط§ط¯ط© ظ‚ط¨ظ„ ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ظ‚ط§ط¯ظ….`,
          priority: "high",
          impact: 88,
          estimatedTime: "90 ط¯ظ‚ظٹظ‚ط©",
          icon: "book-open",
          actionUrl: `/exams?subject=${encodeURIComponent(subject)}`
        });
      }
    });
  }

  // 5. Study Streak Analysis
  if (progress && progress.currentStreak !== undefined) {
    const currentStreak = progress.currentStreak;

    if (currentStreak === 0 && studySessions.length > 0) {
      recommendations.push({
        id: `streak_rebuild_${Date.now()}`,
        type: "study_plan",
        category: "study_plan",
        title: "ط¥ط¹ط§ط¯ط© ط¨ظ†ط§ط، ط³ظ„ط³ظ„ط© ط§ظ„ط¯ط±ط§ط³ط©",
        description: "ظ„ظ… طھط¯ط±ط³ ظ…ظ†ط° ظپطھط±ط©. ظ†ظˆطµظٹ ط¨ط¨ط¯ط، ط¬ظ„ط³ط© ط¯ط±ط§ط³ط© ط§ظ„ظٹظˆظ… ظ„ط¨ط¯ط، ط³ظ„ط³ظ„ط© ط¬ط¯ظٹط¯ط©!",
        priority: "high",
        impact: 85,
        estimatedTime: "30 ط¯ظ‚ظٹظ‚ط©",
        icon: "zap",
        actionUrl: "/time"
      });
    } else if (currentStreak > 0 && currentStreak < 7) {
      recommendations.push({
        id: `streak_week_${Date.now()}`,
        type: "study_plan",
        category: "study_plan",
        title: `${currentStreak} ظٹظˆظ… ظ…طھطھط§ظ„ظٹ - ط§ط³طھظ…ط±!`,
        description: `ط£ظ†طھ ط¹ظ„ظ‰ ط³ظ„ط³ظ„ط© ${currentStreak} ط£ظٹط§ظ…! ط§ط³طھظ…ط± ط­طھظ‰ طھطµظ„ ط¥ظ„ظ‰ ط£ط³ط¨ظˆط¹ ظƒط§ظ…ظ„ ظˆط§ط­طµظ„ ط¹ظ„ظ‰ ط¥ظ†ط¬ط§ط² ط®ط§طµ.`,
        priority: "medium",
        impact: 70,
        estimatedTime: "30 ط¯ظ‚ظٹظ‚ط©",
        icon: "trending-up",
        actionUrl: "/time"
      });
    }
  }

  // 6. Study Pattern Recommendations
  if (avgDailyMinutes > 0 && avgDailyMinutes < 60) {
    recommendations.push({
      id: `study_pattern_${Date.now()}`,
      type: "tip",
      category: "tip",
      title: "طھط­ط³ظٹظ† ظ†ظ…ط· ط§ظ„ط¯ط±ط§ط³ط© ط§ظ„ظٹظˆظ…ظٹ",
      description: `ظ…طھظˆط³ط· ظˆظ‚طھ ط§ظ„ط¯ط±ط§ط³ط© ط§ظ„ظٹظˆظ…ظٹ ظ‡ظˆ ${Math.round(avgDailyMinutes)} ط¯ظ‚ظٹظ‚ط©. ظ†ظˆطµظٹ ط¨ط²ظٹط§ط¯ط© ظ‡ط°ط§ ط§ظ„ظˆظ‚طھ ط¥ظ„ظ‰ 60-90 ط¯ظ‚ظٹظ‚ط© ظٹظˆظ…ظٹط§ظ‹ ظ„طھط­ظ‚ظٹظ‚ ظ†طھط§ط¦ط¬ ط£ظپط¶ظ„.`,
      priority: "medium",
      impact: 75,
      estimatedTime: `${60 - Math.round(avgDailyMinutes)} ط¯ظ‚ظٹظ‚ط©`,
      icon: "lightbulb",
      actionUrl: "/time"
    });
  }

  // 7. Spaced Repetition Recommendations
  const recentSessions = studySessions.slice(0, 10);
  if (recentSessions.length > 0) {
    const oldestRecentSession = recentSessions[recentSessions.length - 1];
    const daysSinceOldest = differenceInDays(new Date(), new Date(oldestRecentSession.startTime));

    if (daysSinceOldest > 3) {
      const subject = oldestRecentSession.subjectId || 'ط§ظ„ظ…ظˆط§ط¯';
      recommendations.push({
        id: `review_${Date.now()}`,
        type: "task",
        category: "task",
        title: "ظ…ط±ط§ط¬ط¹ط© ط§ظ„ظ…ظˆط§ط¯ ط§ظ„ظ‚ط¯ظٹظ…ط©",
        description: `ظ…ط± ${daysSinceOldest} ط£ظٹط§ظ… ظ…ظ†ط° ط¢ط®ط± ط¯ط±ط§ط³ط© ظ„ظ€${subject}. ظ†ظˆطµظٹ ط¨ظ…ط±ط§ط¬ط¹ط© ظ‡ط°ظ‡ ط§ظ„ظ…ظˆط§ط¯ ط§ظ„ط¢ظ† ظ„طھط­ط³ظٹظ† ط§ظ„ط§ط³طھ retention.`,
        priority: "medium",
        impact: 80,
        estimatedTime: "30 ط¯ظ‚ظٹظ‚ط©",
        icon: "book-open",
        actionUrl: `/tasks?subject=${encodeURIComponent(subject)}`
      });
    }
  }

  // 8. Resource Recommendations
  if (examResults.length > 0 && examResults.some(r => r.score < 70)) {
    recommendations.push({
      id: `resource_improvement_${Date.now()}`,
      type: "resource",
      category: "resource",
      title: "ظ…طµط§ط¯ط± طھط¹ظ„ظٹظ…ظٹط© ط¥ط¶ط§ظپظٹط©",
      description: "ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط£ط¯ط§ط¦ظƒ ظپظٹ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھطŒ ظ†ظˆطµظٹ ط¨ط§ط³طھط®ط¯ط§ظ… ظ…طµط§ط¯ط± طھط¹ظ„ظٹظ…ظٹط© ط¥ط¶ط§ظپظٹط© ظ…ط«ظ„ ط§ظ„ظپظٹط¯ظٹظˆظ‡ط§طھ ظˆط§ظ„طھظ…ط§ط±ظٹظ† ط§ظ„طھظپط§ط¹ظ„ظٹط© ظ„طھط­ط³ظٹظ† ظپظ‡ظ…ظƒ.",
      priority: "medium",
      impact: 75,
      icon: "lightbulb",
      actionUrl: "/resources"
    });
  }

  // Sort by impact (highest first) and limit to top 10
  return recommendations
    .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
    .slice(0, 10)
    .map((rec, index) => ({
      ...rec,
      id: `rec_${index}_${Date.now()}`
    }));
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
        tasks,
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
      title: "زيادة وقت الدراسة الأسبوعي",
      description: `أنت تدرس حالياً ${weeklyHours.toFixed(1)} ساعة أسبوعياً. نوصي بزيادة الوقت إلى ${targetHours} ساعة على الأقل لتحقيق أهدافك التعليمية.`,
      priority: "high",
      impact: Math.min(95, 60 + Math.floor(deficit * 5)),
      estimatedTime: `${Math.ceil(deficit * 60)} دقيقة`,
      icon: "target",
      actionUrl: "/schedule"
    });
  }

  // 2. Subject Balance Analysis
  const subjectStats: Record<string, { minutes: number; count: number }> = {};
  studySessions.forEach(session => {
    const subject = session.subjectId || 'غير محدد';
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
        title: `زيادة وقت الدراسة في ${subject}`,
        description: `أنت تدرس ${subject} أقل من المتوسط. نوصي بتخصيص وقت أكثر لهذه المادة لتحسين التوازن.`,
        priority: "medium",
        impact: 75,
        estimatedTime: `${Math.ceil((avgMinutesPerSubject - stats.minutes) / 60)} ساعة`,
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
        title: `${overdueTasks.length} مهمة متأخرة`,
        description: `لديك ${overdueTasks.length} مهمة تجاوزت موعدها. نوصي بمراجعتها وإكمالها في أقرب وقت.`,
        priority: "high",
        impact: 90,
        estimatedTime: `${overdueTasks.length * 30} دقيقة`,
        icon: "clock",
        actionUrl: "/tasks?filter=overdue"
      });
    } else {
      recommendations.push({
        id: `task_pending_${Date.now()}`,
        type: "task",
        category: "task",
        title: `إكمال ${pendingTasks.length} مهمة معلقة`,
        description: `لديك ${pendingTasks.length} مهمة معلقة. معدل الإكمال الحالي ${completionRate.toFixed(0)}%. نوصي بتحسين هذا المعدل.`,
        priority: "medium",
        impact: 80,
        estimatedTime: `${pendingTasks.length * 25} دقيقة`,
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
        title: "تحسين الأداء في الامتحانات",
        description: `متوسط درجاتك ${avgScore.toFixed(0)}%. نوصي بمراجعة المواد التي حصلت فيها على درجات منخفضة والتحضير بشكل أفضل للامتحانات القادمة.`,
        priority: "high",
        impact: 85,
        estimatedTime: "60 دقيقة",
        icon: "target",
        actionUrl: "/exams"
      });
    }

    // Subject-specific recommendations based on grades
    const subjectScores: Record<string, number[]> = {};
    userGrades.forEach(result => {
      const subject = result.exam?.subjectId || 'غير محدد';
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
          title: `تحسين الأداء في ${subject}`,
          description: `متوسط درجاتك في ${subject} هو ${avgSubjectScore.toFixed(0)}%. نوصي بمراجعة شاملة للمادة قبل الامتحان القادم.`,
          priority: "high",
          impact: 88,
          estimatedTime: "90 دقيقة",
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
        title: "إعادة بناء سلسلة الدراسة",
        description: "لم تدرس منذ فترة. نوصي ببدء جلسة دراسة اليوم لبدء سلسلة جديدة!",
        priority: "high",
        impact: 85,
        estimatedTime: "30 دقيقة",
        icon: "zap",
        actionUrl: "/time"
      });
    } else if (currentStreak > 0 && currentStreak < 7) {
      recommendations.push({
        id: `streak_week_${Date.now()}`,
        type: "study_plan",
        category: "study_plan",
        title: `${currentStreak} يوم متتالي - استمر!`,
        description: `أنت على سلسلة ${currentStreak} أيام! استمر حتى تصل إلى أسبوع كامل واحصل على إنجاز خاص.`,
        priority: "medium",
        impact: 70,
        estimatedTime: "30 دقيقة",
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
      title: "تحسين نمط الدراسة اليومي",
      description: `متوسط وقت الدراسة اليومي هو ${Math.round(avgDailyMinutes)} دقيقة. نوصي بزيادة هذا الوقت إلى 60-90 دقيقة يومياً لتحقيق نتائج أفضل.`,
      priority: "medium",
      impact: 75,
      estimatedTime: `${60 - Math.round(avgDailyMinutes)} دقيقة`,
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
      const subject = oldestRecentSession.subjectId || 'المواد';
      recommendations.push({
        id: `review_${Date.now()}`,
        type: "task",
        category: "task",
        title: "مراجعة المواد القديمة",
        description: `مر ${daysSinceOldest} أيام منذ آخر دراسة لـ${subject}. نوصي بمراجعة هذه المواد الآن لتحسين الاست retention.`,
        priority: "medium",
        impact: 80,
        estimatedTime: "30 دقيقة",
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
      title: "مصادر تعليمية إضافية",
      description: "بناءً على أدائك في الامتحانات، نوصي باستخدام مصادر تعليمية إضافية مثل الفيديوهات والتمارين التفاعلية لتحسين فهمك.",
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

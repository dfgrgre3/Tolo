import { prisma } from "@/lib/db";
import { subDays } from "date-fns";

export interface StudentRisk {
  userId: string;
  name: string;
  email: string;
  riskLevel: "CRITICAL" | "WARNING" | "NOTICE";
  reason: string;
  recommendation: string;
}

export interface PerformanceForecast {
  userId: string;
  name: string | null;
  currentScore: number;
  predictedFinalScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export class AnalyticsService {
  static async getChurnPrediction(): Promise<StudentRisk[]> {
    const sevenDaysAgo = subDays(new Date(), 7);
    const threeDaysAgo = subDays(new Date(), 3);

    // Fetch students with their last exam results and login info
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        lastLogin: true,
        examResults: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            score: true,
            createdAt: true
          }
        },
        subjectEnrollments: {
          include: {
            subject: true
          }
        }
      }
    });

    const risks: StudentRisk[] = [];

    for (const student of students) {
      const lastLogin = student.lastLogin ? new Date(student.lastLogin) : null;
      const recentResults = student.examResults;
      const avgScore = recentResults.length > 0 
        ? recentResults.reduce((acc: number, r: { score: number }) => acc + (r.score / 100), 0) / recentResults.length 
        : 1;


      // Logic for CRITICAL (RED)
      if ((!lastLogin || lastLogin < sevenDaysAgo) && avgScore < 0.5) {
        risks.push({
          userId: student.id,
          name: student.name || "طالب غير مسمى",
          email: student.email,
          riskLevel: "CRITICAL",
          reason: "غياب مستمر لأكثر من أسبوع مع تدني ملحوظ في الدرجات (أقل من 50%).",
          recommendation: "إرسال رسالة دعم تحفيزية شخصية واتصال هاتفي فوراً لإزالة العوائق."
        });
        continue;
      }

      // Logic for WARNING (ORANGE)
      if (!lastLogin || lastLogin < threeDaysAgo || (recentResults.length >= 2 && recentResults[0].score < recentResults[1].score * 0.7)) {
        risks.push({
          userId: student.id,
          name: student.name || "طالب غير مسمى",
          email: student.email,
          riskLevel: "WARNING",
          reason: "تذبذب في الحضور أو تراجع حاد (30%+) في نتائج آخر مبارزة علمية.",
          recommendation: "توليد مسار تعليمي مبسط (Bridge Course) لإعادة بناء الأساسيات وتنشيط الحساب."
        });
        continue;
      }

      // Logic for NOTICE (YELLOW)
      if (avgScore < 0.7) {
        risks.push({
          userId: student.id,
          name: student.name || "طالب غير مسمى",
          email: student.email,
          riskLevel: "NOTICE",
          reason: "أداء متوسط يميل للهبوط. يحتاج لمتابعة لضمان عدم الانزلاق لمستويات الخطر.",
          recommendation: "تفعيل أتمتة الرسائل التحفيزية وإضافته في مجموعات التحدي التفاعلية."
        });
      }
    }

    return risks;
  }
  static async getGenerativeSummary(): Promise<string> {
    const riskStudents = await this.getChurnPrediction();
    const criticalCount = riskStudents.filter(s => s.riskLevel === "CRITICAL").length;
    
    const stats = await prisma.$transaction([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.examResult.count({
        where: { createdAt: { gte: subDays(new Date(), 7) } }
      }),
      prisma.studySession.aggregate({
        _sum: { durationMin: true },
        where: { startTime: { gte: subDays(new Date(), 7) } }
      })
    ]);

    const [totalStudents, recentExams, totalStudyTime] = stats;
    const avgStudyTime = totalStudents > 0 ? (totalStudyTime._sum.durationMin || 0) / totalStudents : 0;

    let summary = `تحليل الأداء الأسبوعي للمملكة:\n\n`;
    summary += `📊 شهد هذا الأسبوع نشاطاً قوياً بـ ${recentExams} مبارزة علمية مكتملة. متوسط زمن الدراسة لكل محارب هو ${Math.round(avgStudyTime)} دقيقة.\n\n`;
    
    if (criticalCount > 0) {
      summary += `⚠️ إنذار أحمر: تم رصد ${criticalCount} محاربين في منطقة الخطر الحرجة. نوصي بتفعيل "بروتوكول الاستعادة" فوراً.\n\n`;
    } else {
      summary += `✅ استقرار ممتاز: لا يوجد طلاب في منطقة الخطر الحرجة حالياً. الجيش يتحرك بثبات.\n\n`;
    }

    if (recentExams < totalStudents * 0.5) {
      summary += `💡 توصية ذكية: نلاحظ انخفاضاً في عدد الاختبارات المكتملة مقارنة بعدد الطلاب. نقترح إطلاق "تحدي نهاية الأسبوع" لزيادة التفاعل.`;
    } else {
      summary += `🚀 أداء متصاعد: معدل الاشتباك مع المحتوى التعليمي في أعلى مستوياته. يمكننا الآن رفع مستوى صعوبة التحديات القادمة.`;
    }

    return summary;
  }

  static async getPerformanceForecast(): Promise<PerformanceForecast[]> {
    // Basic forecasting based on current averages
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      include: {
        examResults: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            score: true
          }
        }
      }
    });

    const forecast: (PerformanceForecast | null)[] = students.map((student) => {
      const results = student.examResults;
      if (results.length < 2) return null;
      
      const scores = results.map((r: { score: number }) => r.score);
      const trend = scores[0] - scores[scores.length - 1]; // Very simple trend
      
      return {
        userId: student.id,
        name: student.name,
        currentScore: Math.round(scores[0]),
        predictedFinalScore: Math.min(100, Math.max(0, Math.round(scores[0] + (trend * 0.5)))),
        confidence: results.length >= 5 ? "HIGH" : "MEDIUM"
      };
    });

    const validForecast = forecast.filter((f): f is PerformanceForecast => f !== null);

    return validForecast.slice(0, 10);
  }

  static async executeAiAction(
    actionType: string, 
    params: Record<string, string | number | boolean | any>
  ): Promise<{ success: boolean; message: string }> {
    if (actionType === "notify_inactive") {
      const { days, subjectId } = params;
      // In a real app, this would trigger an email/push notification service
      // For now, we simulate the success
      return { 
        success: true, 
        message: `تم إرسال تنبيهات تحفيزية لجميع الطلاب المتغيبين منذ ${days} أيام بنجاح.` 
      };
    }
    
    if (actionType === "generate_revision_plan") {
      const { studentId } = params;
      return {
        success: true,
        message: "تم إنشاء وترشيح جدول مراجعة ذكي للطالب بناءً على نقاط ضعفه."
      };
    }

    return { success: false, message: "إجراء غير معروف" };
  }

  /**
   * Get the most popular subjects based on exam usage
   */
  static async getSubjectPopularity(days: number = 30) {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        type: { startsWith: 'EXAM_' },
        createdAt: { gte: subDays(now(), days) }
      },
      select: { metadata: true }
    });

    const subjectCounts: Record<string, number> = {};
    events.forEach(event => {
      try {
        const meta = event.metadata ? JSON.parse(event.metadata) : {};
        if (meta.subjectId) {
          subjectCounts[meta.subjectId] = (subjectCounts[meta.subjectId] || 0) + 1;
        }
      } catch (e) {}
    });

    // Map to subject names if possible
    const subjectIds = Object.keys(subjectCounts);
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true }
    });

    return subjects.map(s => ({
      name: s.name,
      count: subjectCounts[s.id]
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Identify peak usage hours for AI and Exams
   */
  static async getPeakUsageHours() {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: subDays(now(), 7) }
      },
      select: { createdAt: true, type: true }
    });

    const hourlyStats: Record<number, { exams: number; ai: number }> = {};
    for (let i = 0; i < 24; i++) hourlyStats[i] = { exams: 0, ai: 0 };

    events.forEach(event => {
      const hour = new Date(event.createdAt).getHours();
      if (event.type.startsWith('EXAM_')) hourlyStats[hour].exams++;
      if (event.type.startsWith('AI_')) hourlyStats[hour].ai++;
    });

    return Object.entries(hourlyStats).map(([hour, stats]) => ({
      hour: parseInt(hour),
      ...stats
    }));
  }

  /**
   * Daily usage trends for the last 14 days
   */
  static async getUsageTrends(days: number = 14) {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: subDays(now(), days) }
      },
      select: { createdAt: true, type: true }
    });

    const dailyStats: Record<string, { exams: number; ai: number }> = {};
    
    events.forEach(event => {
      const date = new Date(event.createdAt).toISOString().split('T')[0];
      if (!dailyStats[date]) dailyStats[date] = { exams: 0, ai: 0 };
      
      if (event.type.startsWith('EXAM_')) dailyStats[date].exams++;
      if (event.type.startsWith('AI_')) dailyStats[date].ai++;
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

// Helper
function now() { return new Date(); }

/**
 * Study Advisor — deterministic decision engine.
 *
 * Consumes ONLY real data (tasks, study windows, deadline risks, workload,
 * recent session cadence) and emits explainable recommendations. No LLM, no
 * invented numbers — the LLM layer (if enabled) may rephrase these, never
 * replace them.
 */

import type {
  DailyPlan,
  DeadlineRiskAssessment,
  PlannableTask,
  Recommendation,
  TimeWindow,
} from "./types";
import { dayOfWeek, minutesSinceMidnight, windowDurationMin } from "./datetime";
import { rankTasks, remainingMin } from "./scoring";
import { assessDeadlineRisk } from "./deadline-risk";

export interface AdvisorContext {
  now: Date;
  tasks: PlannableTask[];
  /** Weekly-template study windows (all weekdays). */
  studyWindows: TimeWindow[];
  todayPlan: DailyPlan | null;
  /** Active study days in the last 7 (from real session history). */
  activeDaysLast7: number;
  /** Minutes studied per subject over the last 7 days. */
  minutesBySubjectLast7: Record<string, number>;
  bufferPct?: number;
}

export function buildRecommendations(ctx: AdvisorContext): Recommendation[] {
  const recs: Recommendation[] = [];
  const { now, tasks, studyWindows, todayPlan, bufferPct = 0.15 } = ctx;
  const open = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
  const ranked = rankTasks(open, now);

  // 1. What to study NOW: highest-ranked task that fits the remaining time
  //    in today's current/upcoming study window.
  const dow = dayOfWeek(now);
  const nowMin = minutesSinceMidnight(now);
  const todayWindows = studyWindows
    .filter((w) => w.day === dow)
    .sort((a, b) => a.startMin - b.startMin);
  const currentWindow = todayWindows.find((w) => nowMin >= w.startMin && nowMin < w.endMin);
  const nextWindow = todayWindows.find((w) => w.startMin > nowMin);
  const remainingInCurrent = currentWindow ? currentWindow.endMin - nowMin : 0;

  if (ranked.length > 0) {
    const top = open.find((t) => t.id === ranked[0]!.taskId);
    if (top) {
      const need = remainingMin(top);
      const reasons = [...ranked[0]!.reasons];
      if (currentWindow) reasons.push(`متبقٍ ${remainingInCurrent} دقيقة في نافذة الدراسة الحالية`);
      else if (nextWindow) reasons.push(`نافذتك القادمة تبدأ بعد ${nextWindow.startMin - nowMin} دقيقة`);
      recs.push({
        kind: "study_now",
        title: `ابدأ الآن: ${top.title}`,
        reasons: reasons.length > 0 ? reasons : ["أعلى مهمة في الترتيب حاليًا"],
        taskId: top.id,
        subject: top.subject,
        priority: 100,
      });
      void need;
    }
  }

  // 2. Deadline risks (HIGH/CRITICAL only).
  const capacity = [0, 0, 0, 0, 0, 0, 0];
  for (const w of studyWindows) capacity[w.day] = (capacity[w.day] ?? 0) + windowDurationMin(w);
  for (const t of open) {
    const risk: DeadlineRiskAssessment | null = assessDeadlineRisk(t, now, capacity, bufferPct);
    if (!risk || (risk.risk !== "HIGH" && risk.risk !== "CRITICAL")) continue;
    recs.push({
      kind: "deadline_risk",
      title:
        risk.risk === "CRITICAL"
          ? `خطر فوات الموعد: ${t.title}`
          : `ضغط موعد نهائي: ${t.title}`,
      reasons: [
        `متبقٍ ${risk.remainingMin} دقيقة عمل مقابل ${risk.availableMinBeforeDeadline} دقيقة متاحة قبل الموعد`,
        risk.daysRemaining >= 0
          ? `الأيام المتبقية: ${risk.daysRemaining} — الوتيرة المطلوبة ${risk.requiredDailyMin} د/يوم`
          : "الموعد النهائي فات بالفعل",
      ],
      taskId: t.id,
      subject: t.subject,
      priority: risk.risk === "CRITICAL" ? 95 : 80,
    });
  }

  // 3. Workload state from today's plan.
  if (todayPlan) {
    const { workload, unscheduled } = todayPlan;
    if (workload.status === "OVERLOADED" || workload.status === "CRITICAL") {
      recs.push({
        kind: "overload",
        title: "اليوم مثقل — قلّص النطاق بدل إضافة ساعات",
        reasons: [
          `الطلب يعادل ${Math.round(workload.utilization * 100)}% من سعة اليوم`,
          unscheduled.length > 0
            ? `${unscheduled.length} مهمة لن تتسع اليوم — انقل الأقل أولوية أو استخدم وقت الاحتياط`
            : "استخدم وقت الاحتياط (buffer) أو انقل مهامًا غير حرجة",
        ],
        priority: 85,
      });
    } else if (workload.status === "UNDERLOADED" && workload.capacityMin > 0 && ranked.length > 1) {
      recs.push({
        kind: "underload",
        title: "لديك سعة فارغة اليوم",
        reasons: [`مخطط ${workload.plannedMin} دقيقة فقط من أصل ${workload.capacityMin} دقيقة متاحة`],
        priority: 40,
      });
    }
  }

  // 4. Subject balance (only with enough data — minimum sample guard).
  const subjectEntries = Object.entries(ctx.minutesBySubjectLast7);
  const totalWeek = subjectEntries.reduce((s, [, m]) => s + m, 0);
  if (subjectEntries.length >= 2 && totalWeek >= 120) {
    const sorted = [...subjectEntries].sort((a, b) => a[1] - b[1]);
    const [weakest, weakestMin] = sorted[0]!;
    const share = Math.round((weakestMin / totalWeek) * 100);
    if (share < 15) {
      recs.push({
        kind: "subject_balance",
        title: `مادة "${weakest}" تحصل على ${share}% فقط من وقتك`,
        reasons: [`${weakestMin} دقيقة من أصل ${totalWeek} دقيقة هذا الأسبوع`],
        subject: weakest,
        priority: 50,
      });
    }
  }

  // 5. Consistency nudge (real streak data, minimum window).
  if (ctx.activeDaysLast7 <= 2 && totalWeek > 0) {
    recs.push({
      kind: "consistency",
      title: "الانتظام منخفض هذا الأسبوع",
      reasons: [`درست ${ctx.activeDaysLast7} أيام فقط من آخر 7 — جلسة قصيرة يوميًا أفضل من المذاكرة المتقطعة`],
      priority: 45,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

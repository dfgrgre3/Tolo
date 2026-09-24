'use client';

/**
 * useDailyPlan — bridges the pure domain engines with live /time data.
 *
 * Deterministic: everything derives from (schedule.planJson, tasks, sessions,
 * now). `now` ticks once per minute so Now/Next/Later stays fresh without
 * re-rendering every second.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  analyzeBacklog,
  annotatePlanProgress,
  assessDeadlineRisk,
  backlogRecoveryRecommendation,
  buildRecommendations,
  buildRecoveryPlan,
  generateDailyPlan,
  type AnnotatedPlanItem,
  type BacklogAnalysis,
  type DailyPlan,
  type DeadlineRiskAssessment,
  type PlanProgressSummary,
  type Recommendation,
  type RecoveryPlan,
} from '@/features/time/domain';
import {
  activeDays,
  extractStudyWindows,
  minutesBySubject,
  parsePlanJson,
  toPlannableTask,
  weeklyCapacityByDay,
} from '@/features/time/adapters';
import { saveScheduleRaw } from '@/features/tasks/api/tasks-gateway';
import { logger } from '@/lib/logger';
import type { Schedule, StudySession, Task } from '../types';

export interface UseDailyPlanReturn {
  now: Date;
  plan: DailyPlan;
  risks: DeadlineRiskAssessment[];
  recommendations: Recommendation[];
  hasStudyWindows: boolean;
  isSavingPlan: boolean;
  /** Plan items annotated with real execution progress (sessions + task status). */
  progressItems: AnnotatedPlanItem[];
  progressSummary: PlanProgressSummary;
  /** Open work outside today's story (overdue / no due date / unscheduled). */
  backlog: BacklogAnalysis;
  /** Capacity-aware recovery plan for the backlog (7-day horizon). */
  recovery: RecoveryPlan;
  /** Persists today's generated plan into schedule.planJson.dailyPlans. */
  savePlan: () => Promise<boolean>;
}

export function useDailyPlan(
  schedule: Schedule | null,
  tasks: Task[],
  studySessions: StudySession[],
  bufferPct = 0.15,
): UseDailyPlanReturn {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const studyWindows = useMemo(() => extractStudyWindows(schedule?.planJson), [schedule?.planJson]);
  const capacity = useMemo(() => weeklyCapacityByDay(schedule?.planJson), [schedule?.planJson]);
  const plannable = useMemo(() => tasks.map(toPlannableTask), [tasks]);

  const plan = useMemo(
    () => generateDailyPlan(now, studyWindows, plannable, { bufferPct }),
    [now, studyWindows, plannable, bufferPct],
  );

  const risks = useMemo(
    () =>
      plannable
        .map((t) => assessDeadlineRisk(t, now, capacity, bufferPct))
        .filter((r): r is DeadlineRiskAssessment => r !== null),
    [plannable, now, capacity, bufferPct],
  );

  // Backlog = open work today's plan doesn't tell a story about: overdue,
  // deadline-less, or pushed out by capacity (plan.unscheduled). Recovery
  // spreads it across the next 7 days using the real weekly capacity map.
  const backlog = useMemo(
    () => analyzeBacklog(plannable, now, plan.unscheduled.map((u) => u.taskId)),
    [plannable, now, plan],
  );

  const recovery = useMemo(
    () => buildRecoveryPlan(backlog, now, capacity),
    [backlog, now, capacity],
  );

  const recommendations = useMemo(() => {
    const recs = buildRecommendations({
      now,
      tasks: plannable,
      studyWindows,
      todayPlan: plan,
      activeDaysLast7: activeDays(studySessions, now, 7),
      minutesBySubjectLast7: minutesBySubject(studySessions, now, 7),
      bufferPct,
    });
    const backlogRec = backlogRecoveryRecommendation(backlog, recovery);
    if (backlogRec) recs.push(backlogRec);
    return recs.sort((a, b) => b.priority - a.priority);
  }, [now, plannable, studyWindows, plan, studySessions, bufferPct, backlog, recovery]);

  // Execution progress is derived, never persisted: today's sessions + task
  // statuses annotate the generated plan (see domain/plan-progress.ts).
  const progress = useMemo(
    () => annotatePlanProgress(plan, studySessions, tasks, now),
    [plan, studySessions, tasks, now],
  );

  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const savePlan = useCallback(async (): Promise<boolean> => {
    if (!schedule) return false;
    setIsSavingPlan(true);
    try {
      // Merge: preserve timeBlocks and previously saved daily plans.
      const { root } = parsePlanJson(schedule.planJson);
      const prevPlans =
        root.dailyPlans && typeof root.dailyPlans === 'object'
          ? (root.dailyPlans as Record<string, unknown>)
          : {};
      const dailyPlans = { ...prevPlans, [plan.date]: plan };
      await saveScheduleRaw({
        planJson: JSON.stringify({
          ...root,
          dailyPlans,
          lastUpdated: new Date().toISOString(),
        }),
      });
      return true;
    } catch (error) {
      logger.error('Failed to persist daily plan:', error);
      return false;
    } finally {
      setIsSavingPlan(false);
    }
  }, [schedule, plan]);

  return {
    now,
    plan,
    risks,
    recommendations,
    hasStudyWindows: studyWindows.length > 0,
    isSavingPlan,
    progressItems: progress.items,
    progressSummary: progress.summary,
    backlog,
    recovery,
    savePlan,
  };
}

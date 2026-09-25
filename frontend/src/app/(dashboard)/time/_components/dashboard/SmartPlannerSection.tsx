'use client';

/**
 * SmartPlannerSection — wires the pure domain engines to the dashboard.
 *
 * Reads schedule.planJson (weekly study windows), open tasks, and session
 * history, then renders: Now/Next/Later, workload, advisor recommendations,
 * and the generated daily plan (persistable into planJson.dailyPlans).
 */

import { toast } from 'sonner';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import NowNextLater from './NowNextLater';
import WorkloadCard from './WorkloadCard';
import AdvisorRecommendations from './AdvisorRecommendations';
import DailyPlanCard from './DailyPlanCard';
import BacklogCard from './BacklogCard';
import type { Schedule, StudySession, Task } from '../../types';

interface SmartPlannerSectionProps {
  schedule: Schedule | null;
  tasks: Task[];
  studySessions: StudySession[];
  onTimerToggle: (taskId?: string) => void;
}

export default function SmartPlannerSection({
  schedule,
  tasks,
  studySessions,
  onTimerToggle,
}: SmartPlannerSectionProps) {
  const { now, plan, recommendations, isSavingPlan, savePlan, progressItems, progressSummary, backlog, recovery } =
    useDailyPlan(schedule, tasks, studySessions);

  const handleSave = async () => {
    const ok = await savePlan();
    if (ok) toast.success('تم حفظ خطة اليوم في جدولك');
    else toast.error('تعذر حفظ الخطة — سجّل الدخول أو حاول مجددًا');
  };

  return (
    <>
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <NowNextLater now={now} items={plan.items} onStartTask={onTimerToggle} />
        <WorkloadCard workload={plan.workload} unscheduledCount={plan.unscheduled.length} />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <AdvisorRecommendations recommendations={recommendations} onStartTask={onTimerToggle} />
        <DailyPlanCard
          plan={plan}
          progressItems={progressItems}
          progressSummary={progressSummary}
          isSaving={isSavingPlan}
          onSave={handleSave}
        />
      </div>

      <div
        className="max-w-2xl"
      >
        <BacklogCard backlog={backlog} recovery={recovery} />
      </div>
    </>
  );
}

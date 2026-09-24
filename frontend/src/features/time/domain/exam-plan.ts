/**
 * Exam planner & revision queue — the "Learn / Re-plan" loop for exams.
 *
 * There is no exam-date API in this project (the home-dash "exams" are
 * practice tests without dates). Exam dates are therefore user-declared and
 * client-persisted; everything HERE stays pure and analyzable:
 *   - countdown + urgency classification,
 *   - readiness from REAL signals only (linked tasks completed vs open,
 *     revision confidence the user recorded) — never invented scores,
 *   - a revision queue ordered by weakness × proximity, with reasons.
 *
 * `now` is always injected.
 */

import type { PlannableTask } from "./types";
import { calendarDaysBetween, localDateKey } from "./datetime";
import { remainingMin } from "./scoring";

/** A user-declared exam (client-persisted until a server API exists). */
export interface ExamPlanRecord {
  id: string;
  title: string;
  subject?: string;
  /** ISO instant of the exam start (UTC-safe). */
  examAt: string;
  /** Topics the user must cover — each with self-reported confidence 0-100. */
  topics: ExamTopic[];
}

export interface ExamTopic {
  id: string;
  title: string;
  /** Self-reported confidence 0-100. */
  confidence: number;
  /** Local date key of last active revision, if any. */
  lastRevisedOn?: string;
}

export type ExamUrgency = "PAST" | "TODAY" | "CLOSE" | "SCHEDULED";

export interface ExamCountdown {
  examId: string;
  daysRemaining: number;
  urgency: ExamUrgency;
  reasons: string[];
}

export function examCountdown(exam: ExamPlanRecord, now: Date): ExamCountdown {
  const when = new Date(exam.examAt);
  if (Number.isNaN(when.getTime())) {
    return {
      examId: exam.id,
      daysRemaining: 0,
      urgency: "PAST",
      reasons: ["تاريخ الامتحان غير صالح"],
    };
  }
  const days = calendarDaysBetween(now, when);
  let urgency: ExamUrgency;
  if (days < 0) urgency = "PAST";
  else if (days === 0) urgency = "TODAY";
  else if (days <= 7) urgency = "CLOSE";
  else urgency = "SCHEDULED";

  const reasons: string[] = [];
  if (days < 0) reasons.push(`فات موعد الامتحان منذ ${Math.abs(days)} يوم`);
  else if (days === 0) reasons.push("الامتحان اليوم");
  else if (days === 1) reasons.push("الامتحان غدًا");
  else reasons.push(`متبقي ${days} يومًا على الامتحان`);

  return { examId: exam.id, daysRemaining: days, urgency, reasons };
}

export interface ExamReadiness {
  examId: string;
  /** 0-100: confidence weighted by revision coverage, minus open-task risk. */
  score: number;
  /** Topics at/below the weak threshold. */
  weakTopicIds: string[];
  /** Topics never revised (no lastRevisedOn). */
  unrevisedCount: number;
  /** Open linked tasks (same subject) and their remaining minutes. */
  openLinkedTasks: number;
  remainingLinkedMin: number;
  reasons: string[];
}
/**
 * Readiness = 60% mean confidence + 40% coverage (revised topics share).
 * Open linked tasks on the same subject REDUCE the score (unfinished
 * coursework before an exam is real risk), floored at 0.
 */
export function assessExamReadiness(
  exam: ExamPlanRecord,
  tasks: readonly PlannableTask[],
  now: Date,
  weakThreshold = 50,
): ExamReadiness {
  const topics = exam.topics ?? [];
  const subject = exam.subject?.trim();

  const confidences = topics.map((t) => Math.min(100, Math.max(0, t.confidence || 0)));
  const meanConf = confidences.length
    ? confidences.reduce((s, c) => s + c, 0) / confidences.length
    : 0;
  const revisedCount = topics.filter((t) => t.lastRevisedOn).length;
  const coverage = topics.length ? (revisedCount / topics.length) * 100 : 0;
  const base = 0.6 * meanConf + 0.4 * coverage;

  const linked = subject
    ? tasks.filter(
        (t) =>
          t.subject === subject &&
          t.status !== "COMPLETED" &&
          t.status !== "CANCELLED",
      )
    : [];
  const openLinked = linked.length;
  const remainingLinked = linked.reduce((s, t) => s + remainingMin(t), 0);
  // Each open linked task costs up to 5 points; harsher when the exam is near.
  const days = examCountdown(exam, now).daysRemaining;
  const proximityMultiplier = days <= 3 ? 1.5 : days <= 7 ? 1.0 : 0.5;
  const penalty = Math.min(40, openLinked * 5 * proximityMultiplier);
  const score = Math.max(0, Math.round(base - penalty));

  const weakTopicIds = topics
    .filter((t) => (t.confidence || 0) <= weakThreshold)
    .map((t) => t.id);
  const unrevised = topics.filter((t) => !t.lastRevisedOn).length;

  const reasons: string[] = [
    `متوسط الثقة ${Math.round(meanConf)}% على ${topics.length} موضوع`,
    `تغطية المراجعة ${Math.round(coverage)}%`,
  ];
  if (openLinked > 0) {
    reasons.push(
      `${openLinked} مهمة مفتوحة في المادة (${remainingLinked} دقيقة) تخفض الجاهزية`,
    );
  }
  if (weakTopicIds.length > 0) {
    reasons.push(`${weakTopicIds.length} موضوع ضعيف (ثقة ≤ ${weakThreshold}%)`);
  }
  if (unrevised > 0) reasons.push(`${unrevised} موضوع لم يُراجع بعد`);

  return {
    examId: exam.id,
    score,
    weakTopicIds,
    unrevisedCount: unrevised,
    openLinkedTasks: openLinked,
    remainingLinkedMin: remainingLinked,
    reasons,
  };
}

export interface RevisionItem {
  examId: string;
  topicId: string;
  title: string;
  subject?: string;
  confidence: number;
  daysToExam: number;
  /** Higher = revise first. */
  priority: number;
  reasons: string[];
}

/**
 * Revision queue across ALL upcoming exams: ordered by weakness × proximity.
 * Past exams are excluded (nothing to revise for). Deterministic ordering:
 * priority desc, then days-to-exam asc, then topic id.
 */
export function buildRevisionQueue(
  exams: readonly ExamPlanRecord[],
  now: Date,
): RevisionItem[] {
  const items: RevisionItem[] = [];

  for (const exam of exams) {
    const cd = examCountdown(exam, now);
    if (cd.daysRemaining < 0) continue;

    for (const topic of exam.topics ?? []) {
      const confidence = Math.min(100, Math.max(0, topic.confidence || 0));
      const weakPoints = 100 - confidence; // 0-100
      // Proximity: ~0 beyond 30 days → 40 the day of the exam.
      const proximity =
        cd.daysRemaining <= 0 ? 40 : Math.round(40 * (1 - Math.min(cd.daysRemaining, 30) / 30));
      const neverRevised = topic.lastRevisedOn ? 0 : 15;
      const priority = weakPoints + proximity + neverRevised;

      const reasons: string[] = [];
      if (confidence <= 50) reasons.push(`ثقة منخفضة ${confidence}%`);
      if (cd.daysRemaining <= 3) reasons.push(`الامتحان بعد ${cd.daysRemaining} يوم`);
      if (neverRevised > 0) reasons.push("لم يُراجع من قبل");

      items.push({
        examId: exam.id,
        topicId: topic.id,
        title: topic.title,
        subject: exam.subject,
        confidence,
        daysToExam: cd.daysRemaining,
        priority,
        reasons: reasons.length ? reasons : [`ثقة ${confidence}%`],
      });
    }
  }

  items.sort(
    (a, b) =>
      b.priority - a.priority ||
      a.daysToExam - b.daysToExam ||
      a.topicId.localeCompare(b.topicId),
  );
  return items;
}

/** Record that a topic was revised today (returns a NEW record — pure). */
export function markTopicRevised(
  exam: ExamPlanRecord,
  topicId: string,
  now: Date,
  confidence?: number,
): ExamPlanRecord {
  return {
    ...exam,
    topics: exam.topics.map((t) =>
      t.id === topicId
        ? {
            ...t,
            lastRevisedOn: localDateKey(now),
            confidence:
              typeof confidence === "number"
                ? Math.min(100, Math.max(0, confidence))
                : t.confidence,
          }
        : t,
    ),
  };
}

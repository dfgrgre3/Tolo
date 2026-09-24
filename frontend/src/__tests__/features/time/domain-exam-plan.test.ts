/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import {
  assessExamReadiness,
  buildRevisionQueue,
  examCountdown,
  markTopicRevised,
} from "@/features/time/domain";
import type { ExamPlanRecord } from "@/features/time/domain";
import { NOW, isoIn, task } from "./helpers";

function exam(partial: Partial<ExamPlanRecord> & { id: string }): ExamPlanRecord {
  return {
    title: partial.id,
    examAt: isoIn(10),
    topics: [],
    ...partial,
  };
}

describe("examCountdown", () => {
  it("classifies urgency bands from injected now", () => {
    expect(examCountdown(exam({ id: "a", examAt: isoIn(0) }), NOW).urgency).toBe("TODAY");
    expect(examCountdown(exam({ id: "b", examAt: isoIn(3) }), NOW).urgency).toBe("CLOSE");
    expect(examCountdown(exam({ id: "c", examAt: isoIn(7) }), NOW).urgency).toBe("CLOSE");
    expect(examCountdown(exam({ id: "d", examAt: isoIn(8) }), NOW).urgency).toBe("SCHEDULED");
    expect(examCountdown(exam({ id: "e", examAt: isoIn(-1) }), NOW).urgency).toBe("PAST");
  });

  it("returns day counts and Arabic reasons", () => {
    const cd = examCountdown(exam({ id: "x", examAt: isoIn(5) }), NOW);
    expect(cd.daysRemaining).toBe(5);
    expect(cd.reasons[0]).toContain("متبقي 5 يومًا");

    const tomorrow = examCountdown(exam({ id: "y", examAt: isoIn(1) }), NOW);
    expect(tomorrow.reasons[0]).toBe("الامتحان غدًا");
  });

  it("degrades invalid dates to PAST without throwing", () => {
    const cd = examCountdown(exam({ id: "bad", examAt: "not-a-date" }), NOW);
    expect(cd.urgency).toBe("PAST");
    expect(cd.reasons[0]).toContain("غير صالح");
  });
});

describe("assessExamReadiness", () => {
  it("scores confidence × coverage with no tasks", () => {
    const e = exam({
      id: "math",
      subject: "رياضيات",
      topics: [
        { id: "t1", title: "تفاضل", confidence: 80, lastRevisedOn: "2026-09-23" },
        { id: "t2", title: "تكامل", confidence: 40, lastRevisedOn: "2026-09-20" },
      ],
    });
    const r = assessExamReadiness(e, [], NOW);
    // mean = 60, coverage = 100 → 0.6*60 + 0.4*100 = 76.
    expect(r.score).toBe(76);
    expect(r.weakTopicIds).toEqual(["t2"]);
    expect(r.unrevisedCount).toBe(0);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("lowers score for topics never revised (coverage < 100)", () => {
    const e = exam({ id: "bio", topics: [{ id: "t1", title: "خلية", confidence: 80 }] });
    const r = assessExamReadiness(e, [], NOW);
    // mean = 80, coverage = 0 → 0.6*80 = 48.
    expect(r.score).toBe(48);
    expect(r.unrevisedCount).toBe(1);
  });

  it("penalizes open linked tasks on the same subject, harder near the exam", () => {
    const topics = [{ id: "t1", title: "x", confidence: 100, lastRevisedOn: "2026-09-23" }];
    const linked = [
      task({ id: "k1", subject: "فيزياء", estimatedMin: 60 }),
      task({ id: "k2", subject: "فيزياء", estimatedMin: 30 }),
    ];
    const far = assessExamReadiness(
      exam({ id: "f", subject: "فيزياء", examAt: isoIn(20), topics }),
      linked,
      NOW,
    );
    const near = assessExamReadiness(
      exam({ id: "n", subject: "فيزياء", examAt: isoIn(2), topics }),
      linked,
      NOW,
    );
    // far: 0.6*100+0.4*100 = 100, penalty 2*5*0.5 = 5 → 95.
    expect(far.score).toBe(95);
    // near: penalty 2*5*1.5 = 15 → 85.
    expect(near.score).toBe(85);
    expect(near.openLinkedTasks).toBe(2);
    expect(near.remainingLinkedMin).toBe(90);
    expect(near.reasons.some((r) => r.includes("مهمة مفتوحة"))).toBe(true);
  });

  it("ignores completed and cancelled linked tasks, and other subjects", () => {
    const e = exam({
      id: "chem",
      subject: "كيمياء",
      topics: [{ id: "t", title: "x", confidence: 100, lastRevisedOn: "2026-09-23" }],
    });
    const r = assessExamReadiness(
      e,
      [
        task({ id: "c1", subject: "كيمياء", status: "COMPLETED" }),
        task({ id: "c2", subject: "كيمياء", status: "CANCELLED" }),
        task({ id: "c3", subject: "أحياء" }),
      ],
      NOW,
    );
    expect(r.score).toBe(100);
    expect(r.openLinkedTasks).toBe(0);
  });

  it("never returns a negative score", () => {
    const e = exam({
      id: "z",
      subject: "ض",
      examAt: isoIn(1),
      topics: [{ id: "t", title: "x", confidence: 0 }],
    });
    const many = Array.from({ length: 10 }, (_, i) => task({ id: `m${i}`, subject: "ض" }));
    const r = assessExamReadiness(e, many, NOW);
    expect(r.score).toBe(0);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("buildRevisionQueue", () => {
  it("orders by weakness × proximity and excludes past exams", () => {
    const near = exam({
      id: "near",
      examAt: isoIn(2),
      topics: [
        { id: "strong", title: "قوي", confidence: 90, lastRevisedOn: "2026-09-23" },
        { id: "weak", title: "ضعيف", confidence: 20 },
      ],
    });
    const far = exam({
      id: "far",
      examAt: isoIn(30),
      topics: [{ id: "mid", title: "متوسط", confidence: 50, lastRevisedOn: "2026-09-22" }],
    });
    const past = exam({
      id: "past",
      examAt: isoIn(-1),
      topics: [{ id: "ghost", title: "ماضي", confidence: 0 }],
    });

    const queue = buildRevisionQueue([far, past, near], NOW);
    // Weak + near exam first; "ghost" from past exam excluded.
    expect(queue.map((q) => q.topicId)).toEqual(["weak", "mid", "strong"]);
    expect(queue[0]?.reasons.some((r) => r.includes("ثقة منخفضة"))).toBe(true);
    expect(queue[0]?.reasons.some((r) => r.includes("الامتحان بعد 2 يوم"))).toBe(true);
    // Never-revised topics get a bonus (+15).
    expect(queue[0]!.priority).toBeGreaterThan(queue[1]!.priority);
  });

  it("is deterministic for equal priorities (topic id tiebreak)", () => {
    const e = exam({
      id: "tie",
      examAt: isoIn(10),
      topics: [
        { id: "b", title: "b", confidence: 50 },
        { id: "a", title: "a", confidence: 50 },
      ],
    });
    expect(buildRevisionQueue([e], NOW).map((q) => q.topicId)).toEqual(["a", "b"]);
  });
});

describe("markTopicRevised", () => {
  it("stamps today's local date and updates confidence (pure)", () => {
    const e = exam({ id: "m", topics: [{ id: "t1", title: "x", confidence: 30 }] });
    const next = markTopicRevised(e, "t1", NOW, 75);
    expect(next.topics[0]?.confidence).toBe(75);
    expect(next.topics[0]?.lastRevisedOn).toBe(
      // Local date key (toISOString would cross the UTC day boundary).
      `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-${String(NOW.getDate()).padStart(2, "0")}`,
    );
    // Original untouched.
    expect(e.topics[0]?.confidence).toBe(30);
    expect(e.topics[0]?.lastRevisedOn).toBeUndefined();
    // Unknown topic id → no-op copy.
    const noop = markTopicRevised(e, "nope", NOW, 99);
    expect(noop.topics).toEqual(e.topics);
  });
});


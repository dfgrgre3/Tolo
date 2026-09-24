import { describe, expect, it } from "vitest";
import {
  buildRecommendations,
  generateDailyPlan,
  generateOccurrences,
  nextOccurrence,
  type TimeWindow,
} from "@/features/time/domain";
import { isoIn, NOW, task } from "./helpers";

describe("advisor", () => {
  const studyWindows: TimeWindow[] = [{ day: 4, startMin: 480, endMin: 720 }]; // 08:00-12:00 (now=10:00)

  it("recommends the top-ranked task to study now", () => {
    const recs = buildRecommendations({
      now: NOW,
      tasks: [task({ id: "urgent", title: "مراجعة", dueAt: isoIn(0), priority: "HIGH", estimatedMin: 60 })],
      studyWindows,
      todayPlan: null,
      activeDaysLast7: 5,
      minutesBySubjectLast7: {},
    });
    expect(recs[0]!.kind).toBe("study_now");
    expect(recs[0]!.taskId).toBe("urgent");
    expect(recs[0]!.reasons.length).toBeGreaterThan(0);
  });

  it("emits deadline-risk recommendations with data-backed reasons", () => {
    const recs = buildRecommendations({
      now: NOW,
      tasks: [task({ id: "risky", dueAt: isoIn(-1), estimatedMin: 300 })],
      studyWindows,
      todayPlan: null,
      activeDaysLast7: 7,
      minutesBySubjectLast7: {},
    });
    const risk = recs.find((r) => r.kind === "deadline_risk");
    expect(risk).toBeDefined();
    expect(risk!.reasons.some((r) => r.includes("فات"))).toBe(true);
  });

  it("flags overload from the daily plan", () => {
    const heavy = [task({ id: "h", estimatedMin: 600, dueAt: isoIn(0), priority: "URGENT" })];
    const plan = generateDailyPlan(NOW, studyWindows, heavy);
    const recs = buildRecommendations({
      now: NOW,
      tasks: heavy,
      studyWindows,
      todayPlan: plan,
      activeDaysLast7: 7,
      minutesBySubjectLast7: {},
    });
    expect(recs.find((r) => r.kind === "overload")).toBeDefined();
  });

  it("flags subject imbalance only with a sufficient sample", () => {
    const recs = buildRecommendations({
      now: NOW,
      tasks: [],
      studyWindows,
      todayPlan: null,
      activeDaysLast7: 7,
      minutesBySubjectLast7: { math: 300, phys: 300, chem: 30 },
    });
    const balance = recs.find((r) => r.kind === "subject_balance");
    expect(balance).toBeDefined();
    expect(balance!.subject).toBe("chem");
  });

  it("does not flag imbalance on tiny samples (guard)", () => {
    const recs = buildRecommendations({
      now: NOW,
      tasks: [],
      studyWindows,
      todayPlan: null,
      activeDaysLast7: 7,
      minutesBySubjectLast7: { math: 60, phys: 5 },
    });
    expect(recs.find((r) => r.kind === "subject_balance")).toBeUndefined();
  });
});

describe("recurrence", () => {
  const from = new Date(2026, 8, 1);
  const to = new Date(2026, 8, 30);

  it("generates daily occurrences bounded by endDate", () => {
    const keys = generateOccurrences(
      { freq: "DAILY", startDate: "2026-09-01", endDate: "2026-09-05" },
      from,
      to,
    );
    expect(keys).toEqual(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]);
  });

  it("honours interval cadence and skip list", () => {
    const keys = generateOccurrences(
      { freq: "EVERY_X_DAYS", interval: 3, startDate: "2026-09-01" },
      from,
      new Date(2026, 8, 10),
      new Set(["2026-09-04"]),
    );
    expect(keys).toEqual(["2026-09-01", "2026-09-07", "2026-09-10"]);
  });

  it("generates weekday occurrences only", () => {
    const keys = generateOccurrences(
      { freq: "WEEKDAYS", weekdays: [0, 4], startDate: "2026-09-01" },
      new Date(2026, 8, 3), // Thu
      new Date(2026, 8, 7), // Mon
    );
    expect(keys).toEqual(["2026-09-03", "2026-09-06"]); // Thu + Sun
  });

  it("finds the next occurrence after a date", () => {
    const next = nextOccurrence(
      { freq: "WEEKDAYS", weekdays: [6], startDate: "2026-09-01" },
      new Date(2026, 8, 24), // Thursday
    );
    expect(next).toBe("2026-09-26"); // Saturday
  });

  it("returns null when the rule already ended", () => {
    const next = nextOccurrence(
      { freq: "DAILY", startDate: "2026-09-01", endDate: "2026-09-10" },
      new Date(2026, 9, 1),
    );
    expect(next).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { classifyVariance, computeProductivity } from "@/features/time/domain";

describe("productivity", () => {
  it("gives 100 for a perfect week", () => {
    const p = computeProductivity({
      dueTasksCompleted: 10,
      dueTasksTotal: 10,
      plannedMin: 600,
      actualFocusMin: 600,
      activeDays: 7,
      periodDays: 7,
      goalProgressPct: 100,
      avgSessionMin: 50,
    });
    expect(p.score).toBe(100);
  });

  it("gives 0 for a fully empty week", () => {
    const p = computeProductivity({
      dueTasksCompleted: 0,
      dueTasksTotal: 5,
      plannedMin: 600,
      actualFocusMin: 0,
      activeDays: 0,
      periodDays: 7,
      goalProgressPct: 0,
      avgSessionMin: 0,
    });
    expect(p.score).toBe(0);
  });

  it("caps adherence at 100 even when over-studying", () => {
    const p = computeProductivity({
      dueTasksCompleted: 0,
      dueTasksTotal: 0,
      plannedMin: 100,
      actualFocusMin: 500,
      activeDays: 0,
      periodDays: 7,
      goalProgressPct: 0,
      avgSessionMin: 0,
    });
    expect(p.components.scheduleAdherence.value).toBe(100);
  });

  it("weights partial weeks correctly and exposes components", () => {
    const p = computeProductivity({
      dueTasksCompleted: 5,
      dueTasksTotal: 10, // 50
      plannedMin: 600,
      actualFocusMin: 300, // 50
      activeDays: 7,
      periodDays: 7, // 100
      goalProgressPct: 0,
      avgSessionMin: 25, // 100
    });
    // 50*.3 + 50*.25 + 100*.2 + 100*.15 + 0 = 15 + 12.5 + 20 + 15 = 62.5 → 63
    expect(p.score).toBe(63);
    expect(p.components.completionRate.value).toBe(50);
  });
});

describe("planned-vs-actual", () => {
  it("classifies on-plan within ±15%", () => {
    expect(classifyVariance(100, 108, "COMPLETED").category).toBe("ON_PLAN");
  });
  it("classifies skipped pending work", () => {
    expect(classifyVariance(100, 0, "PENDING").category).toBe("SKIPPED");
  });
  it("classifies late completion and big underestimates", () => {
    expect(classifyVariance(100, 150, "COMPLETED").category).toBe("COMPLETED_LATE");
    expect(classifyVariance(100, 300, "COMPLETED").category).toBe("UNDERESTIMATED");
  });
  it("classifies early and partial", () => {
    expect(classifyVariance(100, 70, "COMPLETED").category).toBe("COMPLETED_EARLY");
    expect(classifyVariance(100, 40, "IN_PROGRESS").category).toBe("PARTIAL");
  });
});

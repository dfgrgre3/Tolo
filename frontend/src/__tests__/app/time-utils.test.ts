import { describe, it, expect } from "vitest";
import {
  formatTime,
  calculateFocusScore,
  calculateDisciplineScore,
  calculateMasteryScore,
  calculateStudyEfficiency,
} from "@/app/(dashboard)/time/utils/timeUtils";
import { calculateGameMetrics } from "@/app/(dashboard)/time/utils/gameUtils";
import type { TimeStats } from "@/app/(dashboard)/time/types";

describe("formatTime", () => {
  it("formats zero as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("pads minutes and seconds", () => {
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(65)).toBe("01:05");
  });

  it("handles hour-plus durations", () => {
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("calculateFocusScore", () => {
  it("gives zero for zero pomodoros", () => {
    expect(calculateFocusScore(0)).toBe(0);
  });

  it("scores 10 points per pomodoro plus consistency bonus", () => {
    // 2 بومودورو = 20 نقطة أساس + 4 مكافأة = 24
    expect(calculateFocusScore(2)).toBe(24);
  });

  it("caps the final score at 100", () => {
    expect(calculateFocusScore(50)).toBe(100);
  });

  it("awards the flat consistency bonus beyond 5 sessions", () => {
    // 6 بومودورو = 60 + 10 = 70
    expect(calculateFocusScore(6)).toBe(70);
  });

  it("penalizes very short sessions (length adjustment floor 0.8)", () => {
    const short = calculateFocusScore(2, 10); // جلسات 10 دقائق
    const ideal = calculateFocusScore(2, 25);
    expect(short).toBeLessThan(ideal);
  });

  it("rewards longer sessions up to the 1.2 ceiling", () => {
    const long = calculateFocusScore(2, 50);
    const ideal = calculateFocusScore(2, 25);
    expect(long).toBeGreaterThan(ideal);
  });
});

describe("calculateDisciplineScore", () => {
  it("returns zero with no tasks", () => {
    expect(calculateDisciplineScore(0, 0, 0)).toBe(0);
  });

  it("full completion and a 30-day streak approaches the cap", () => {
    const score = calculateDisciplineScore(10, 10, 30);
    // 50 (إنجاز) + 30 (استمرارية) + 20 (إدارة) = 100
    expect(score).toBe(100);
  });

  it("is capped at 100 even with extreme inputs", () => {
    expect(calculateDisciplineScore(100, 100, 365)).toBe(100);
  });

  it("partial completion yields a partial score", () => {
    const score = calculateDisciplineScore(5, 10, 0);
    // 25 (إنجاز 50%) + 0 + 10 (إدارة 50%) = 35
    expect(score).toBe(35);
  });

  it("never returns negative", () => {
    expect(calculateDisciplineScore(0, 10, 0)).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateMasteryScore", () => {
  it("combines completion, focus ratio and daily goal with weights 50/30/20", () => {
    // 100*0.5 + 1.0*100*0.3 + 100*0.2 = 100
    expect(calculateMasteryScore(100, 1.0, 100)).toBe(100);
  });

  it("caps at 100", () => {
    expect(calculateMasteryScore(200, 2, 200)).toBe(100);
  });

  it("zero inputs yield zero", () => {
    expect(calculateMasteryScore(0, 0, 0)).toBe(0);
  });
});

describe("calculateStudyEfficiency", () => {
  it("returns zero when there is no estimated time", () => {
    expect(calculateStudyEfficiency(30, 0)).toBe(0);
  });

  it("perfect score when actual matches estimated", () => {
    expect(calculateStudyEfficiency(60, 60)).toBe(100);
  });

  it("penalizes deviation from the ideal symmetrically", () => {
    const over = calculateStudyEfficiency(90, 60); // 50% أكثر
    const under = calculateStudyEfficiency(30, 60); // 50% أقل
    expect(over).toBe(75);
    expect(under).toBe(75);
  });

  it("floors at zero for extreme overruns", () => {
    expect(calculateStudyEfficiency(600, 60)).toBe(0);
  });
});

describe("calculateGameMetrics", () => {
  const baseStats: TimeStats = {
    level: 4,
    xp: 600,
    nextLevelXp: 1000,
    rank: "متقن",
  } as unknown as TimeStats;

  it("derives progress percentage from xp and nextLevelXp", () => {
    const metrics = calculateGameMetrics(baseStats);
    expect(metrics.level).toBe(4);
    expect(metrics.currentXP).toBe(600);
    expect(metrics.xpForNextLevel).toBe(1000);
    expect(metrics.progressPercentage).toBe(60);
    expect(metrics.rank).toBe("متقن");
  });

  it("falls back to safe defaults for empty stats", () => {
    const metrics = calculateGameMetrics({} as TimeStats);
    expect(metrics.level).toBe(1);
    expect(metrics.currentXP).toBe(0);
    expect(metrics.xpForNextLevel).toBe(1000);
    expect(metrics.progressPercentage).toBe(0);
    expect(metrics.rank).toBe("مبتدئ");
  });

  it("reports 100% when xp reaches the threshold", () => {
    const metrics = calculateGameMetrics({ ...baseStats, xp: 1000 } as TimeStats);
    expect(metrics.progressPercentage).toBe(100);
  });
});

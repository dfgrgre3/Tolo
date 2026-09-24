import { describe, expect, it } from "vitest";
import {
  analyzeWorkload,
  assessDeadlineRisk,
  capacityByWeekday,
  classifyUtilization,
  type TimeWindow,
} from "@/features/time/domain";
import { isoIn, NOW, task } from "./helpers";

describe("workload", () => {
  it("classifies utilization bands", () => {
    expect(classifyUtilization(0.3)).toBe("UNDERLOADED");
    expect(classifyUtilization(0.6)).toBe("BALANCED");
    expect(classifyUtilization(0.9)).toBe("HEAVY");
    expect(classifyUtilization(1.1)).toBe("OVERLOADED");
    expect(classifyUtilization(1.5)).toBe("CRITICAL");
  });

  it("reserves buffer and clamps planned to plannable", () => {
    const w = analyzeWorkload(400, 500, 0.15);
    expect(w.bufferMin).toBe(60);
    expect(w.plannableMin).toBe(340);
    expect(w.plannedMin).toBe(340);
    expect(w.status).toBe("CRITICAL");
  });

  it("handles zero capacity safely", () => {
    const w = analyzeWorkload(0, 100);
    expect(w.status).toBe("CRITICAL");
    expect(w.plannedMin).toBe(0);
  });
});

describe("deadline-risk", () => {
  const heavyWindows: TimeWindow[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    day: d as TimeWindow["day"],
    startMin: 960,
    endMin: 1080, // 2h every day
  }));

  it("returns null without a due date", () => {
    expect(assessDeadlineRisk(task({ id: "n" }), NOW, capacityByWeekday(heavyWindows))).toBeNull();
  });

  it("marks overdue tasks CRITICAL", () => {
    const r = assessDeadlineRisk(
      task({ id: "o", dueAt: isoIn(-1), estimatedMin: 120 }),
      NOW,
      capacityByWeekday(heavyWindows),
    );
    expect(r!.risk).toBe("CRITICAL");
  });

  it("compares remaining work against real capacity", () => {
    // 10h remaining, due in 7 days, 2h/day for 8 days incl. today, net 15% buffer
    // → 816 min available; ratio 600/816 ≈ 0.74 → MEDIUM
    const r = assessDeadlineRisk(
      task({ id: "t", dueAt: isoIn(7), estimatedMin: 600 }),
      NOW,
      capacityByWeekday(heavyWindows),
      0.15,
    );
    expect(r).not.toBeNull();
    expect(r!.availableMinBeforeDeadline).toBe(Math.round(8 * 120 * 0.85));
    expect(r!.risk).toBe("MEDIUM");
    expect(r!.requiredDailyMin).toBe(Math.ceil(600 / 8));
  });

  it("marks impossible workloads CRITICAL", () => {
    const r = assessDeadlineRisk(
      task({ id: "x", dueAt: isoIn(1), estimatedMin: 1200 }),
      NOW,
      capacityByWeekday(heavyWindows),
      0.15,
    );
    expect(r!.risk).toBe("CRITICAL");
  });
});

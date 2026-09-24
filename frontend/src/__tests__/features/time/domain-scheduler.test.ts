import { describe, expect, it } from "vitest";
import { generateDailyPlan, type TimeWindow } from "@/features/time/domain";
import { isoIn, NOW, task } from "./helpers";

describe("scheduler", () => {
  const thuWindows: TimeWindow[] = [
    { day: 4, startMin: 960, endMin: 1080 }, // 16:00-18:00
    { day: 4, startMin: 1140, endMin: 1260 }, // 19:00-21:00
  ];
  const tasks = [
    task({ id: "a", title: "رياضيات", subject: "math", priority: "HIGH", dueAt: isoIn(0), estimatedMin: 90 }),
    task({ id: "b", title: "فيزياء", subject: "phys", dueAt: isoIn(3), estimatedMin: 60 }),
    task({ id: "c", title: "كيمياء", subject: "chem", dueAt: isoIn(10), estimatedMin: 40 }),
  ];

  it("plans only inside study windows and is deterministic", () => {
    const p1 = generateDailyPlan(NOW, thuWindows, tasks);
    const p2 = generateDailyPlan(NOW, thuWindows, tasks);
    expect(p1).toEqual(p2);
    expect(p1.capacityMin).toBe(240);
    for (const item of p1.items) {
      const inWindow = thuWindows.some(
        (w) => item.startMin >= w.startMin && item.endMin <= w.endMin,
      );
      expect(inWindow).toBe(true);
      expect(item.reasons.length).toBeGreaterThan(0);
    }
  });

  it("puts the deadline-critical task first", () => {
    const plan = generateDailyPlan(NOW, thuWindows, tasks);
    expect(plan.items[0]!.taskId).toBe("a");
  });

  it("chunks long tasks to maxSessionMin", () => {
    const long = [task({ id: "long", estimatedMin: 180, dueAt: isoIn(0), priority: "URGENT" })];
    const plan = generateDailyPlan(NOW, thuWindows, long, { maxSessionMin: 50 });
    for (const item of plan.items) {
      expect(item.endMin - item.startMin).toBeLessThanOrEqual(50);
    }
  });

  it("never plans past the buffer", () => {
    const tinyWindows: TimeWindow[] = [{ day: 4, startMin: 960, endMin: 990 }]; // 30 min
    const big = [task({ id: "big", estimatedMin: 300, dueAt: isoIn(0), priority: "URGENT" })];
    const plan = generateDailyPlan(NOW, tinyWindows, big, { bufferPct: 0.15, minSessionMin: 15 });
    expect(plan.items.reduce((s, i) => s + (i.endMin - i.startMin), 0)).toBeLessThanOrEqual(25);
  });

  it("explains when a day has no study windows", () => {
    const plan = generateDailyPlan(NOW, [], tasks);
    expect(plan.items).toHaveLength(0);
    expect(plan.unscheduled.length).toBeGreaterThan(0);
    expect(plan.unscheduled.every((u) => u.reason.includes("لا توجد نوافذ"))).toBe(true);
  });

  it("respects invalid windows by filtering them out", () => {
    const bad: TimeWindow[] = [{ day: 4, startMin: 1080, endMin: 960 }];
    const plan = generateDailyPlan(NOW, bad, tasks);
    expect(plan.capacityMin).toBe(0);
    expect(plan.items).toHaveLength(0);
  });

  it("reports overflow as unscheduled with reasons", () => {
    const overflow = [
      task({ id: "x", estimatedMin: 500, dueAt: isoIn(0), priority: "URGENT" }),
      task({ id: "y", estimatedMin: 400, dueAt: isoIn(1), priority: "HIGH" }),
    ];
    const plan = generateDailyPlan(NOW, thuWindows, overflow);
    expect(plan.unscheduled.length).toBeGreaterThan(0);
    for (const u of plan.unscheduled) {
      expect(u.reason.length).toBeGreaterThan(0);
      expect(u.remainingMin).toBeGreaterThan(0);
    }
  });
});

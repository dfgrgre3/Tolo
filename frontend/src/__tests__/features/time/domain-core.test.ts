import { describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  detectConflicts,
  isValidWindow,
  parseHHMM,
  rankTasks,
  remainingMin,
  scoreTask,
  subtractWindows,
  toHHMM,
  windowsOverlap,
  type ScheduleBlock,
  type TimeWindow,
} from "@/features/time/domain";
import { isoIn, NOW, task } from "./helpers";

describe("datetime", () => {
  it("parses and formats HH:mm symmetrically", () => {
    expect(parseHHMM("08:30")).toBe(510);
    expect(parseHHMM("7:05")).toBe(425);
    expect(toHHMM(510)).toBe("08:30");
    expect(toHHMM(parseHHMM("23:59")!)).toBe("23:59");
    expect(parseHHMM("25:00")).toBeNull();
    expect(parseHHMM("abc")).toBeNull();
  });

  it("computes calendar-day differences ignoring time-of-day", () => {
    const a = new Date(2026, 8, 24, 23, 59);
    const b = new Date(2026, 8, 25, 0, 1);
    expect(calendarDaysBetween(a, b)).toBe(1);
    expect(calendarDaysBetween(b, a)).toBe(-1);
    expect(calendarDaysBetween(a, a)).toBe(0);
  });

  it("detects window overlap and validates bounds", () => {
    const w1: TimeWindow = { day: 4, startMin: 480, endMin: 600 };
    const w2: TimeWindow = { day: 4, startMin: 540, endMin: 660 };
    const w3: TimeWindow = { day: 5, startMin: 540, endMin: 660 };
    expect(windowsOverlap(w1, w2)).toBe(true);
    expect(windowsOverlap(w1, w3)).toBe(false);
    expect(isValidWindow(w1)).toBe(true);
    expect(isValidWindow({ day: 4, startMin: 600, endMin: 480 })).toBe(false);
  });

  it("subtracts busy windows from free windows", () => {
    const free: TimeWindow[] = [{ day: 0, startMin: 480, endMin: 720 }];
    const busy: TimeWindow[] = [{ day: 0, startMin: 540, endMin: 600 }];
    expect(subtractWindows(free, busy)).toEqual([
      { day: 0, startMin: 480, endMin: 540 },
      { day: 0, startMin: 600, endMin: 720 },
    ]);
  });
});

describe("conflicts", () => {
  const fixed: ScheduleBlock = { id: "a", day: 4, startMin: 480, endMin: 600, kind: "fixed", locked: true, title: "درس" };
  const study: ScheduleBlock = { id: "b", day: 4, startMin: 540, endMin: 660, kind: "study", title: "مذاكرة" };

  it("reports overlap with deterministic suggestions", () => {
    const [c] = detectConflicts([fixed, study]);
    expect(c).toBeDefined();
    expect(c!.overlapMin).toBe(60);
    expect(c!.suggestions.some((s) => s.includes("مذاكرة"))).toBe(true);
  });

  it("ignores non-overlapping and invalid blocks", () => {
    const later: ScheduleBlock = { id: "c", day: 4, startMin: 660, endMin: 720, kind: "study" };
    const invalid: ScheduleBlock = { id: "d", day: 4, startMin: 700, endMin: 600, kind: "study" };
    expect(detectConflicts([fixed, study, later, invalid])).toHaveLength(1);
  });
});

describe("scoring", () => {
  it("ranks overdue above due-today above far-future", () => {
    const overdue = scoreTask(task({ id: "o", dueAt: isoIn(-2) }), NOW);
    const today = scoreTask(task({ id: "t", dueAt: isoIn(0) }), NOW);
    const future = scoreTask(task({ id: "f", dueAt: isoIn(30) }), NOW);
    const none = scoreTask(task({ id: "n" }), NOW);
    expect(overdue.total).toBeGreaterThan(today.total);
    expect(today.total).toBeGreaterThan(future.total);
    expect(future.total).toBeGreaterThan(none.total);
  });

  it("adds priority and low-mastery points and explains them", () => {
    const s = scoreTask(
      task({ id: "x", priority: "URGENT", masteryScore: 20, dueAt: isoIn(1) }),
      NOW,
    );
    expect(s.priorityPoints).toBe(25);
    expect(s.masteryPoints).toBe(12);
    expect(s.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("remainingMin never returns 0 for unestimated open tasks", () => {
    expect(remainingMin(task({ id: "u" }))).toBe(25);
    expect(remainingMin(task({ id: "e", estimatedMin: 60, actualMin: 45 }))).toBe(15);
    expect(remainingMin(task({ id: "z", estimatedMin: 30, actualMin: 40 }))).toBe(0);
  });

  it("excludes completed/cancelled tasks from ranking", () => {
    const ranked = rankTasks(
      [task({ id: "done", status: "COMPLETED" }), task({ id: "open", dueAt: isoIn(0) })],
      NOW,
    );
    expect(ranked.map((r) => r.taskId)).toEqual(["open"]);
  });
});

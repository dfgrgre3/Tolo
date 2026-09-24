/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import {
  analyzeBacklog,
  backlogRecoveryRecommendation,
  buildRecoveryPlan,
} from "@/features/time/domain";
import { NOW, isoIn, task } from "./helpers";

describe("analyzeBacklog", () => {
  it("classifies overdue, due-today, and no-deadline tasks", () => {
    const backlog = analyzeBacklog(
      [
        task({ id: "over", dueAt: isoIn(-2) }),
        task({ id: "today", dueAt: isoIn(0) }),
        task({ id: "nodue" }),
        task({ id: "future", dueAt: isoIn(5) }),
        task({ id: "done", status: "COMPLETED", dueAt: isoIn(-3) }),
      ],
      NOW,
    );
    const ids = backlog.items.map((i) => i.taskId).sort();
    // "future" is planned (not overdue/no-due/unscheduled) → excluded.
    expect(ids).toEqual(["nodue", "over", "today"]);
    expect(backlog.overdueCount).toBe(2);
    expect(backlog.noDueCount).toBe(1);
    expect(backlog.unscheduledCount).toBe(0);
  });

  it("captures tasks the scheduler could not fit (unscheduled ids)", () => {
    const backlog = analyzeBacklog(
      [task({ id: "slipped", dueAt: isoIn(4) }), task({ id: "kept", dueAt: isoIn(6) })],
      NOW,
      ["slipped"],
    );
    expect(backlog.items.map((i) => i.taskId)).toEqual(["slipped"]);
    expect(backlog.items[0]?.reason).toBe("UNSCHEDULED");
    expect(backlog.unscheduledCount).toBe(1);
    expect(backlog.overdueCount).toBe(0);
  });

  it("ranks overdue tasks before non-overdue and sums remaining minutes", () => {
    const backlog = analyzeBacklog(
      [
        task({ id: "soft", dueAt: isoIn(1), estimatedMin: 30, actualMin: 30 }),
        task({ id: "hard", dueAt: isoIn(-1), estimatedMin: 60 }),
        task({ id: "plain" }),
      ],
      NOW,
      ["soft"],
    );
    expect(backlog.items[0]?.taskId).toBe("hard");
    // 60 remaining (hard) + 0 (soft fully spent) + 25 fallback (plain, no estimate).
    expect(backlog.totalMin).toBe(85);
    expect(backlog.items[0]?.reasons[0]).toContain("متأخرة");
  });

  it("returns an empty analysis when nothing has slipped", () => {
    const backlog = analyzeBacklog([task({ id: "ok", dueAt: isoIn(9) })], NOW);
    expect(backlog.items).toHaveLength(0);
    expect(backlog.totalMin).toBe(0);
    expect(backlogRecoveryRecommendation(backlog, buildRecoveryPlan(backlog, NOW, [0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});

describe("buildRecoveryPlan", () => {
  // Capacity map: weekday of NOW (Thu=4) onward, simplest: all days 120 min.
  const cap = [120, 120, 120, 120, 120, 120, 120];

  it("spreads backlog across days within buffered capacity", () => {
    const backlog = analyzeBacklog([task({ id: "a", dueAt: isoIn(-1), estimatedMin: 100 })], NOW);
    const plan = buildRecoveryPlan(backlog, NOW, cap, 7, 0.15);
    // Net capacity/day = 120 * 0.85 = 102 → fits day 1 alone.
    expect(plan.feasible).toBe(true);
    expect(plan.overflowMin).toBe(0);
    expect(plan.assignedMin).toBe(100);
    expect(plan.days[0]?.date).toBe(
      // Local components — mirrors localDateKey (toISOString would shift across UTC).
      `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-${String(NOW.getDate()).padStart(2, "0")}`,
    );
    expect(plan.days[0]?.assignedMin).toBe(100);
    expect(plan.reasons[0]).toContain("خطة تعافٍ");
  });

  it("reports overflow when backlog exceeds the horizon capacity", () => {
    const backlog = analyzeBacklog(
      [task({ id: "huge", dueAt: isoIn(-1), estimatedMin: 1000 })],
      NOW,
    );
    const plan = buildRecoveryPlan(backlog, NOW, cap, 3, 0);
    // 3 days × 120 = 360 assigned of 1000 → overflow 640.
    expect(plan.days).toHaveLength(3);
    expect(plan.assignedMin).toBe(360);
    expect(plan.overflowMin).toBe(640);
    expect(plan.feasible).toBe(false);
    expect(plan.reasons[0]).toContain("السعة لا تكفي");
  });

  it("stops early once the backlog is exhausted and ignores zero-capacity days", () => {
    const backlog = analyzeBacklog(
      [task({ id: "small", dueAt: isoIn(-1), estimatedMin: 30 })],
      NOW,
    );
    // Only Wednesday(index 3) and Friday(index 5) have capacity; today is Thursday(4)=0.
    const plan = buildRecoveryPlan(backlog, NOW, [0, 0, 0, 120, 0, 60, 0], 7, 0);
    // Thu(4) capacity 0 → assigned 0, then Fri(5) carries all 30.
    expect(plan.days[0]?.assignedMin).toBe(0);
    expect(plan.days[1]?.assignedMin).toBe(30);
    expect(plan.days).toHaveLength(2);
    expect(plan.feasible).toBe(true);
  });
});

describe("backlogRecoveryRecommendation", () => {
  it("emits a high-priority recommendation when overdue tasks exist", () => {
    const backlog = analyzeBacklog([task({ id: "late", dueAt: isoIn(-3), estimatedMin: 45 })], NOW);
    const plan = buildRecoveryPlan(backlog, NOW, [120, 120, 120, 120, 120, 120, 120]);
    const rec = backlogRecoveryRecommendation(backlog, plan);
    expect(rec).not.toBeNull();
    expect(rec!.kind).toBe("backlog_recovery");
    expect(rec!.taskId).toBe("late");
    expect(rec!.priority).toBe(92);
    expect(rec!.reasons.some((r) => r.includes("1 مهمة متأخرة"))).toBe(true);
    expect(rec!.reasons.some((r) => r.includes("backlog"))).toBe(true);
  });

  it("lowers priority when nothing is overdue but work slipped the plan", () => {
    const backlog = analyzeBacklog([task({ id: "slip", dueAt: isoIn(2), estimatedMin: 60 })], NOW, ["slip"]);
    const plan = buildRecoveryPlan(backlog, NOW, [120, 120, 120, 120, 120, 120, 120]);
    const rec = backlogRecoveryRecommendation(backlog, plan);
    expect(rec!.priority).toBe(60);
    expect(rec!.title).toContain("خارج الخطة");
  });
});
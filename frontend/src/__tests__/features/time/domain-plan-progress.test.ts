import { describe, expect, it } from "vitest";
import { annotatePlanProgress, type DailyPlan, type PlanItem, type TaskStatus } from "@/features/time/domain";

// Thu 24 Sep 2026, 10:00 local
const NOW = new Date(2026, 8, 24, 10, 0, 0);
const DATE = "2026-09-24";

function item(partial: Partial<PlanItem> & { title: string }): PlanItem {
  return {
    day: 4, // Thursday
    startMin: 600,
    endMin: 625,
    kind: "study",
    reasons: ["test"],
    ...partial,
  };
}

function plan(items: PlanItem[]): DailyPlan {
  return {
    date: DATE,
    items,
    capacityMin: 480,
    plannedMin: items.length * 25,
    bufferMin: 72,
    workload: {
      status: "BALANCED",
      capacityMin: 480,
      plannableMin: 408,
      plannedMin: items.length * 25,
      bufferMin: 72,
      utilization: 0.5,
    },
    unscheduled: [],
  };
}

const sessionAt = (hour: number, day = 24) => ({
  taskId: "t1",
  startTime: new Date(2026, 8, day, hour, 0, 0).toISOString(),
  durationMin: 25,
});

const statuses = (s: TaskStatus): { id: string; status: TaskStatus }[] => [{ id: "t1", status: s }];

describe("annotatePlanProgress", () => {
  it("marks an item COMPLETED when logged minutes cover the plan", () => {
    const { items, summary } = annotatePlanProgress(
      plan([item({ taskId: "t1", title: "Physics", startMin: 570, endMin: 595 })]), // 09:30-09:55, past
      [sessionAt(9)],
      statuses("PENDING"),
      NOW,
    );
    expect(items[0]!.progress.state).toBe("COMPLETED");
    expect(summary.adherencePct).toBe(100);
  });

  it("marks COMPLETED from task status even without sessions", () => {
    const { items } = annotatePlanProgress(
      plan([item({ taskId: "t1", title: "Math", startMin: 570, endMin: 595 })]),
      [],
      statuses("COMPLETED"),
      NOW,
    );
    expect(items[0]!.progress.state).toBe("COMPLETED");
  });

  it("marks STARTED (partial) when fewer minutes were logged", () => {
    const { items, summary } = annotatePlanProgress(
      plan([item({ taskId: "t1", title: "Physics", startMin: 570, endMin: 595 })]),
      [{ ...sessionAt(9), durationMin: 10 }],
      statuses("IN_PROGRESS"),
      NOW,
    );
    expect(items[0]!.progress.state).toBe("STARTED");
    expect(items[0]!.progress.loggedMin).toBe(10);
    expect(summary.adherencePct).toBe(40);
  });

  it("marks MISSED when the window passed with no logged minutes", () => {
    const { items } = annotatePlanProgress(
      plan([item({ taskId: "t1", title: "Physics", startMin: 480, endMin: 505 })]), // 08:00-08:25
      [],
      statuses("PENDING"),
      NOW,
    );
    expect(items[0]!.progress.state).toBe("MISSED");
  });

  it("marks ACTIVE for the current window and UPCOMING for future ones", () => {
    const { items } = annotatePlanProgress(
      plan([
        item({ taskId: "t1", title: "Now", startMin: 590, endMin: 615 }),
        item({ taskId: "t2", title: "Later", startMin: 660, endMin: 685 }),
      ]),
      [],
      [],
      NOW,
    );
    expect(items[0]!.progress.state).toBe("ACTIVE");
    expect(items[1]!.progress.state).toBe("UPCOMING");
  });

  it("water-fills logged minutes across chunked items in chronological order", () => {
    const { items, summary } = annotatePlanProgress(
      plan([
        item({ taskId: "t1", title: "Chunk 1", startMin: 480, endMin: 505 }),
        item({ taskId: "t1", title: "Chunk 2", startMin: 515, endMin: 540 }),
      ]),
      [{ ...sessionAt(8), durationMin: 30 }],
      statuses("PENDING"),
      NOW,
    );
    expect(items[0]!.progress).toMatchObject({ state: "COMPLETED", loggedMin: 25 });
    expect(items[1]!.progress).toMatchObject({ state: "STARTED", loggedMin: 5 });
    expect(summary.completedItems).toBe(1);
    expect(summary.totalItems).toBe(2);
  });

  it("ignores sessions from other days and malformed timestamps", () => {
    const { items } = annotatePlanProgress(
      plan([item({ taskId: "t1", title: "Physics", startMin: 570, endMin: 595 })]),
      [sessionAt(9, 23), { taskId: "t1", startTime: "not-a-date", durationMin: 25 }],
      statuses("PENDING"),
      NOW,
    );
    expect(items[0]!.progress.state).toBe("MISSED");
  });

  it("ignores sessions without a taskId and non-positive durations", () => {
    const { items, summary } = annotatePlanProgress(
      plan([item({ taskId: "t1", title: "Physics", startMin: 570, endMin: 595 })]),
      [{ startTime: new Date(2026, 8, 24, 9).toISOString(), durationMin: 30 }],
      statuses("PENDING"),
      NOW,
    );
    expect(items[0]!.progress.state).toBe("MISSED");
    expect(summary.loggedMin).toBe(0);
    expect(summary.adherencePct).toBe(0);
  });

  it("treats non-task items (breaks/buffers) as time-based only", () => {
    const { items } = annotatePlanProgress(
      plan([
        item({ title: "Break", kind: "break", startMin: 480, endMin: 490 }),
        item({ title: "Upcoming break", kind: "break", startMin: 700, endMin: 710 }),
      ]),
      [{ ...sessionAt(8), durationMin: 10 }],
      [],
      NOW,
    );
    expect(items[0]!.progress.state).toBe("ELAPSED");
    expect(items[0]!.progress.loggedMin).toBe(0);
    expect(items[1]!.progress.state).toBe("UPCOMING");
  });

  it("returns 0% adherence when nothing is planned", () => {
    const { summary } = annotatePlanProgress(plan([]), [], [], NOW);
    expect(summary).toEqual({ plannedMin: 0, loggedMin: 0, completedItems: 0, totalItems: 0, adherencePct: 0 });
  });
});

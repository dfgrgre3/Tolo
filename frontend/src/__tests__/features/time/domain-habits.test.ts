/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import { habitStats, habitWeekCells, migrateV1Habit, toggleHabitDate } from "@/features/time/domain";
import type { HabitEntry } from "@/features/time/domain";
import { NOW } from "./helpers";

function entry(dates: string[], title = "مراجعة"): HabitEntry {
  return { id: "h1", title, doneDates: dates };
}

/** Local "yyyy-mm-dd" for NOW (Thu 24 Sep 2026) and offsets. */
function key(offsetDays = 0): string {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("toggleHabitDate", () => {
  it("adds a missing date and removes an existing one (pure)", () => {
    const base = entry([key(0)]);
    const removed = toggleHabitDate(base, key(0));
    expect(removed.doneDates).toEqual([]);
    expect(base.doneDates).toEqual([key(0)]); // original untouched

    const added = toggleHabitDate(removed, key(-1));
    expect(added.doneDates).toEqual([key(-1)]);
  });
});

describe("habitStats", () => {
  it("counts a live streak ending today", () => {
    const s = habitStats(entry([key(-2), key(-1), key(0)]), NOW);
    expect(s.streak).toBe(3);
    expect(s.doneToday).toBe(true);
    expect(s.doneLast7).toBe(3);
    expect(s.consistencyPct).toBe(43); // 3/7
  });

  it("keeps yesterday's streak alive when today is still pending", () => {
    const s = habitStats(entry([key(-3), key(-2), key(-1)]), NOW);
    expect(s.streak).toBe(3);
    expect(s.doneToday).toBe(false);
  });

  it("breaks the streak when yesterday is also missing", () => {
    // Done: today only, with a gap before → current streak = 1.
    const s = habitStats(entry([key(-5), key(0)]), NOW);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(1);
    // Nothing recent at all → 0 (not an unbounded "current" streak).
    const none = habitStats(entry([key(-10), key(-9)]), NOW);
    expect(none.streak).toBe(0);
    expect(none.bestStreak).toBe(2);
  });

  it("computes best streak across a week boundary and detects a perfect week", () => {
    // NOW = Thu 24 Sep 2026; a 4-day run ending last Sunday (Sep 20).
    const s = habitStats(entry([key(-8), key(-7), key(-6), key(-5)]), NOW);
    expect(s.bestStreak).toBe(4);

    const perfect = habitStats(entry([key(-6), key(-5), key(-4), key(-3), key(-2), key(-1), key(0)]), NOW);
    expect(perfect.doneLast7).toBe(7);
    expect(perfect.consistencyPct).toBe(100);
    expect(perfect.perfectWeek).toBe(true);
  });

  it("ignores malformed date keys instead of crashing", () => {
    const s = habitStats(entry(["garbage", "", key(0)]), NOW);
    expect(s.streak).toBe(1);
    expect(s.doneLast7).toBe(1);
  });
});

describe("habitWeekCells", () => {
  it("returns 7 days oldest→newest with today flagged and Arabic labels", () => {
    const cells = habitWeekCells(entry([key(0)]), NOW);
    expect(cells).toHaveLength(7);
    expect(cells[6]?.key).toBe(key(0));
    expect(cells[6]?.isToday).toBe(true);
    expect(cells[6]?.done).toBe(true);
    expect(cells[0]?.key).toBe(key(-6));
    expect(cells[0]?.isToday).toBe(false);
    // NOW is Thursday → day index 4 → "خ".
    expect(cells[6]?.dayOfWeek).toBe(4);
    expect(cells[6]?.label).toBe("خ");
  });

  it("marks done flags from history", () => {
    const cells = habitWeekCells(entry([key(-1)]), NOW);
    expect(cells[5]?.done).toBe(true);
    expect(cells.filter((c) => c.done)).toHaveLength(1);
  });
});

describe("migrateV1Habit", () => {
  it("maps weekLog booleans onto the trailing 7 real dates (index 6 = today)", () => {
    const weekLog = [true, false, false, false, false, true, true]; // index 0..6
    const migrated = migrateV1Habit({ id: "legacy", title: "رياضة", weekLog }, NOW);
    expect(migrated.id).toBe("legacy");
    expect(migrated.title).toBe("رياضة");
    expect(migrated.doneDates).toContain(key(0)); // index 6
    expect(migrated.doneDates).toContain(key(-1)); // index 5
    expect(migrated.doneDates).toContain(key(-6)); // index 0
    expect(migrated.doneDates).toHaveLength(3);
    // Migration feeds a live streak straight away.
    expect(habitStats(migrated, NOW).streak).toBe(2);
  });

  it("degrades malformed v1 payloads to an empty habit with a fallback id", () => {
    const migrated = migrateV1Habit({} as Record<string, unknown>, NOW);
    expect(migrated.doneDates).toEqual([]);
    expect(migrated.id).toBeTruthy();
    expect(migrated.title).toBe("عادة");
  });
});
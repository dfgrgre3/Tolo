import { describe, expect, it } from "vitest";
import {
  occursOn,
  toDomainRule,
  wasGeneratedOn,
  type UiRecurringRule,
} from "@/app/(dashboard)/time/utils/recurrenceRules";

// Thu 24 Sep 2026. Weekday indices: Sun=0 … Sat=6.
const THU = new Date(2026, 8, 24, 12, 0, 0);
const FRI = new Date(2026, 8, 25, 12, 0, 0);
const SAT = new Date(2026, 8, 26, 12, 0, 0);
const MON = new Date(2026, 8, 21, 12, 0, 0);
const WED = new Date(2026, 8, 23, 12, 0, 0);

const rule = (partial: UiRecurringRule): UiRecurringRule => ({
  startDate: "2026-09-20", // Sunday — before all test dates
  ...partial,
});

describe("toDomainRule", () => {
  it("returns null for CUSTOM_DAYS without valid days (rule can never fire)", () => {
    expect(toDomainRule(rule({ pattern: "CUSTOM_DAYS", days: [] }), THU)).toBeNull();
    expect(toDomainRule(rule({ pattern: "CUSTOM_DAYS", days: [9, -1] }), THU)).toBeNull();
  });

  it("defaults WEEKLY to Saturday when no weekday is stored", () => {
    expect(toDomainRule(rule({ pattern: "WEEKLY" }), THU)).toMatchObject({
      freq: "WEEKDAYS",
      weekdays: [6],
    });
  });

  it("falls back to today for legacy rules without startDate", () => {
    const mapped = toDomainRule({ pattern: "DAILY" }, THU);
    expect(mapped).toMatchObject({ freq: "DAILY", interval: 1, startDate: "2026-09-24" });
  });
});

describe("occursOn (delegates to the domain engine)", () => {
  it("DAILY fires every day", () => {
    const r = rule({ pattern: "DAILY" });
    expect(occursOn(r, THU)).toBe(true);
    expect(occursOn(r, SAT)).toBe(true);
  });

  it("WEEKDAYS fires Sun–Thu but not Fri/Sat", () => {
    const r = rule({ pattern: "WEEKDAYS" });
    expect(occursOn(r, THU)).toBe(true);
    expect(occursOn(r, MON)).toBe(true);
    expect(occursOn(r, FRI)).toBe(false);
    expect(occursOn(r, SAT)).toBe(false);
  });

  it("WEEKLY fires on the selected weekday only", () => {
    const r = rule({ pattern: "WEEKLY", days: [6] });
    expect(occursOn(r, SAT)).toBe(true);
    expect(occursOn(r, THU)).toBe(false);
  });

  it("CUSTOM_DAYS fires on exactly the selected days", () => {
    const r = rule({ pattern: "CUSTOM_DAYS", days: [1, 3] }); // Mon + Wed
    expect(occursOn(r, MON)).toBe(true);
    expect(occursOn(r, WED)).toBe(true);
    expect(occursOn(r, THU)).toBe(false);
    expect(occursOn(r, SAT)).toBe(false);
  });

  it("never fires before startDate", () => {
    const r = { pattern: "CUSTOM_DAYS" as const, days: [1], startDate: "2026-09-22" };
    expect(occursOn(r, MON)).toBe(false); // Sep 21 < startDate
  });
});

describe("wasGeneratedOn (idempotency across legacy and padded date keys)", () => {
  it("matches padded and legacy (0-based month) keys, and treats missing as not generated", () => {
    expect(wasGeneratedOn("2026-09-24", THU)).toBe(true);
    expect(wasGeneratedOn("2026-8-24", THU)).toBe(true); // legacy: getMonth() is 0-based (Sep → 8)
    expect(wasGeneratedOn("2026-09-23", THU)).toBe(false);
    expect(wasGeneratedOn(undefined, THU)).toBe(false);
  });
});

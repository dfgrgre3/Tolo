import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercentage,
} from "@/lib/utils";

describe("Date Formatting", () => {
  it("formatDate should format date correctly in Arabic", () => {
    const date = new Date("2024-03-15");
    const formatted = formatDate(date);
    expect(formatted).toContain("2024");
    expect(formatted).toContain("مارس");
  });

  it("formatDateTime should include time", () => {
    const date = new Date("2024-03-15T14:30:00");
    const formatted = formatDateTime(date);
    expect(formatted).toContain("2024");
    expect(formatted).toContain("14");
  });

  it("formatRelativeTime should return 'الآن' for recent dates", () => {
    const now = new Date();
    const result = formatRelativeTime(now);
    expect(result).toBe("الآن");
  });

  it("formatRelativeTime should return minutes for recent past", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinutesAgo);
    expect(result).toContain("5");
    expect(result).toContain("دقيقة");
  });

  it("formatRelativeTime should handle hours", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toContain("2");
    expect(result).toContain("ساعة");
  });

  it("formatRelativeTime should handle days", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(threeDaysAgo);
    expect(result).toContain("3");
    expect(result).toContain("يوم");
  });

  it("formatRelativeTime should handle future dates", () => {
    const future = new Date(Date.now() + 5 * 60 * 1000);
    const result = formatRelativeTime(future);
    expect(result).toContain("5");
    expect(result).toContain("دقيقة");
  });

  it("formatRelativeTime should handle null/undefined", () => {
    expect(formatRelativeTime(null)).toBe("تاريخ غير صحيح");
    expect(formatRelativeTime(undefined)).toBe("تاريخ غير صحيح");
  });
});

describe("Number Formatting", () => {
  it("formatNumber should format with Arabic numerals", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formatNumber should handle decimals", () => {
    expect(formatNumber(1234.56, 2)).toBe("1,234.56");
  });

  it("formatNumber should handle zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("Currency Formatting", () => {
  it("formatCurrency should format EGP correctly", () => {
    const formatted = formatCurrency(1500, "EGP");
    expect(formatted).toContain("1,500");
    expect(formatted).toContain("ج.م");
  });

  it("formatCurrency should format USD correctly", () => {
    const formatted = formatCurrency(100, "USD");
    expect(formatted).toContain("100");
    expect(formatted).toContain("$");
  });

  it("formatCurrency should handle zero", () => {
    const formatted = formatCurrency(0);
    expect(formatted).toContain("0");
  });
});

describe("Percentage Formatting", () => {
  it("formatPercentage should format correctly", () => {
    expect(formatPercentage(0.8567, 1)).toBe("85.7%");
  });

  it("formatPercentage should handle 0", () => {
    expect(formatPercentage(0)).toBe("0%");
  });

  it("formatPercentage should handle 1", () => {
    expect(formatPercentage(1)).toBe("100%");
  });
});

import { describe, it, expect } from "vitest";
import { readApiErrorMessage } from "@/lib/api/api-error-utils";

describe("readApiErrorMessage", () => {
  it("prefers error string", () => {
    expect(readApiErrorMessage({ error: "غير مسموح" }, "افتراضي")).toBe("غير مسموح");
  });

  it("falls back to message", () => {
    expect(readApiErrorMessage({ message: "انتهت الجلسة" }, "افتراضي")).toBe(
      "انتهت الجلسة",
    );
  });

  it("uses fallback when empty", () => {
    expect(readApiErrorMessage({}, "افتراضي")).toBe("افتراضي");
  });
});

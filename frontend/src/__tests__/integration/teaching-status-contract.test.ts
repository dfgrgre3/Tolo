import { describe, expect, it } from "vitest";
import {
  buildCourseUpdateBody,
  toTeachingStatusTransport,
} from "@/app/teaching/hooks/use-teaching-data";

describe("teaching course status transport", () => {
  it.each(["DRAFT", "UNDER_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"] as const)(
    "preserves canonical uppercase status %s",
    (status) => {
      expect(toTeachingStatusTransport(status)).toBe(status);
      expect(buildCourseUpdateBody({ status })).toEqual({ status });
    },
  );
});

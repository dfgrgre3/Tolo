import { describe, it, expect } from "vitest";
import {
  generateChallenge,
  verifyChallenge,
  challengePromptText,
} from "@/lib/auth/human-challenge";

describe("human challenge", () => {
  it("generates solvable addition and subtraction (never negative)", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge();
      expect(c.answer).toBeGreaterThanOrEqual(0);
      if (c.op === "+") {
        expect(c.answer).toBe(c.a + c.b);
      } else {
        expect(c.answer).toBe(c.a - c.b);
      }
      expect(verifyChallenge(c, { challengeId: c.id, input: String(c.answer) })).toBe(true);
    }
  });

  it("accepts padded input but rejects non-numeric and wrong answers", () => {
    const c = generateChallenge(() => 0.1);
    expect(verifyChallenge(c, { challengeId: c.id, input: ` ${c.answer} ` })).toBe(true);
    expect(verifyChallenge(c, { challengeId: c.id, input: String(c.answer + 1) })).toBe(false);
    expect(verifyChallenge(c, { challengeId: c.id, input: "" })).toBe(false);
    expect(verifyChallenge(c, { challengeId: c.id, input: "abc" })).toBe(false);
    expect(verifyChallenge(c, { challengeId: c.id, input: "1+1" })).toBe(false);
  });

  it("rejects answers bound to a different challenge id (no replay)", () => {
    const c = generateChallenge(() => 0.1);
    const other = generateChallenge(() => 0.9);
    expect(
      verifyChallenge(other, { challengeId: c.id, input: String(other.answer) })
    ).toBe(false);
  });

  it("renders an Arabic prompt", () => {
    const c = generateChallenge(() => 0.1);
    expect(challengePromptText(c)).toMatch(/كم ناتج/);
  });
});

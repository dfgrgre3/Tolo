import { describe, it, expect, beforeEach } from "vitest";
import {
  getThrottle,
  recordFailure,
  recordSuccess,
  resetThrottle,
  THROTTLE_CONFIGS,
  type ThrottleScope,
} from "@/lib/auth/attempt-throttle";

const SCOPES: ThrottleScope[] = ["login", "mfa", "forgot-send", "forgot-code", "verify-email"];

beforeEach(() => {
  window.localStorage.clear();
});

describe("attempt throttle", () => {
  it("starts fresh: full budget, no lock, no captcha", () => {
    for (const scope of SCOPES) {
      const s = getThrottle(scope);
      expect(s.locked).toBe(false);
      expect(s.remainingMs).toBe(0);
      expect(s.remainingAttempts).toBe(THROTTLE_CONFIGS[scope].maxAttempts);
      expect(s.captchaRequired).toBe(false);
    }
  });

  it("counts failures down and raises the captcha gate at the threshold", () => {
    const config = THROTTLE_CONFIGS.login; // maxAttempts 5, captchaAfter 3
    let s = getThrottle("login");
    for (let i = 1; i < config.captchaAfter; i++) {
      s = recordFailure("login");
      expect(s.locked).toBe(false);
      expect(s.captchaRequired).toBe(false);
      expect(s.remainingAttempts).toBe(config.maxAttempts - i);
    }
    s = recordFailure("login");
    expect(s.captchaRequired).toBe(true);
    expect(s.locked).toBe(false);
  });

  it("locks after the budget is exhausted and unlocks after the wait", () => {
    const config = THROTTLE_CONFIGS.mfa;
    let s = getThrottle("mfa");
    for (let i = 0; i < config.maxAttempts; i++) {
      s = recordFailure("mfa");
    }
    expect(s.locked).toBe(true);
    expect(s.remainingMs).toBeGreaterThan(0);
    expect(s.remainingMs).toBeLessThanOrEqual(config.baseLockoutMs);
    expect(s.remainingAttempts).toBe(0);
  });

  it("escalates: the second lockout lasts longer than the first", () => {
    const firsts: number[] = [];
    // Exhaust → locked. Fast-forward by faking the deadline into the past.
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < THROTTLE_CONFIGS.login.maxAttempts; i++) {
        recordFailure("login");
      }
      const locked = getThrottle("login");
      expect(locked.locked).toBe(true);
      firsts.push(locked.remainingMs);
      // Simulate expiry: rewrite the stored deadline to the past.
      const raw = window.localStorage.getItem("thanawy:throttle:v1")!;
      const store = JSON.parse(raw) as Record<string, { lockedUntil: number }>;
      store.login!.lockedUntil = Date.now() - 1;
      window.localStorage.setItem("thanawy:throttle:v1", JSON.stringify(store));
    }
    expect(firsts[1]).toBeGreaterThan(firsts[0]!);
  });

  it("a failure arriving mid-lockout never extends the deadline", () => {
    for (let i = 0; i < THROTTLE_CONFIGS.login.maxAttempts; i++) {
      recordFailure("login");
    }
    const before = getThrottle("login").remainingMs;
    const after = recordFailure("login").remainingMs;
    expect(after).toBeLessThanOrEqual(before);
  });

  it("the server wait wins when longer than the client estimate", () => {
    for (let i = 0; i < THROTTLE_CONFIGS.login.maxAttempts - 1; i++) {
      recordFailure("login");
    }
    const s = recordFailure("login", 10 * 60_000);
    expect(s.locked).toBe(true);
    // Server said 10min; client estimate for the first lockout is 1min.
    expect(s.remainingMs).toBeGreaterThan(60_000);
    expect(s.remainingMs).toBeLessThanOrEqual(10 * 60_000);
  });

  it("a shorter server wait does not shrink the client lockout", () => {
    for (let i = 0; i < THROTTLE_CONFIGS.login.maxAttempts - 1; i++) {
      recordFailure("login");
    }
    const s = recordFailure("login", 1000);
    expect(s.remainingMs).toBeGreaterThan(1000);
  });

  it("success resets failures, escalation, and the captcha gate", () => {
    recordFailure("login");
    recordFailure("login");
    recordFailure("login");
    expect(getThrottle("login").captchaRequired).toBe(true);
    const s = recordSuccess("login");
    expect(s.locked).toBe(false);
    expect(s.captchaRequired).toBe(false);
    expect(s.remainingAttempts).toBe(THROTTLE_CONFIGS.login.maxAttempts);
  });

  it("scopes are independent", () => {
    for (let i = 0; i < THROTTLE_CONFIGS.login.maxAttempts; i++) {
      recordFailure("login");
    }
    expect(getThrottle("login").locked).toBe(true);
    expect(getThrottle("mfa").locked).toBe(false);
    expect(getThrottle("forgot-send").locked).toBe(false);
  });

  it("persists across reads (reload does not reset the counter)", () => {
    recordFailure("verify-email");
    recordFailure("verify-email");
    const s = getThrottle("verify-email");
    expect(s.remainingAttempts).toBe(THROTTLE_CONFIGS["verify-email"].maxAttempts - 2);
  });

  it("resetThrottle clears one scope only", () => {
    recordFailure("login");
    recordFailure("mfa");
    resetThrottle("login");
    expect(getThrottle("login").remainingAttempts).toBe(THROTTLE_CONFIGS.login.maxAttempts);
    expect(getThrottle("mfa").remainingAttempts).toBe(THROTTLE_CONFIGS.mfa.maxAttempts - 1);
  });

  it("mfa-class scopes never require captcha (lockout is the friction)", () => {
    for (const scope of ["mfa", "forgot-code", "verify-email"] as const) {
      for (let i = 0; i < THROTTLE_CONFIGS[scope].maxAttempts - 1; i++) {
        const s = recordFailure(scope);
        expect(s.captchaRequired).toBe(false);
      }
      resetThrottle(scope);
    }
  });
});

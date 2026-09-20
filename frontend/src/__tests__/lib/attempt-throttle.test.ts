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
    const config = THROTTLE_CONFIGS.login; // maxAttempts 4, captchaAfter 3
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

  it("escalates: the second lockout lasts longer than the first", () => {    const firsts: number[] = [];
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

  it("login follows the 5 → 10 → 15 minute ladder with a decaying budget", () => {
    const budgets = [4, 3, 2];
    const durations: number[] = [];
    for (let round = 0; round < 3; round++) {
      // Fresh round budget shrinks by one per served lockout.
      expect(getThrottle("login").remainingAttempts).toBe(budgets[round]);
      for (let i = 0; i < budgets[round]!; i++) {
        recordFailure("login");
      }
      const locked = getThrottle("login");
      expect(locked.locked).toBe(true);
      durations.push(locked.remainingMs);
      const raw = window.localStorage.getItem("thanawy:throttle:v1")!;
      const store = JSON.parse(raw) as Record<string, { lockedUntil: number }>;
      store.login!.lockedUntil = Date.now() - 1;
      window.localStorage.setItem("thanawy:throttle:v1", JSON.stringify(store));
    }
    expect(durations[0]).toBeLessThanOrEqual(5 * 60_000);
    expect(durations[0]).toBeGreaterThan(4 * 60_000);
    expect(durations[1]).toBeLessThanOrEqual(10 * 60_000);
    expect(durations[1]).toBeGreaterThan(9 * 60_000);
    expect(durations[2]).toBeLessThanOrEqual(15 * 60_000);
    expect(durations[2]).toBeGreaterThan(14 * 60_000);
  });

  it("login budget floors at one attempt per round", () => {
    // Serve 4 lockouts (budgets 4,3,2,1), then the budget stays at 1.
    for (const budget of [4, 3, 2, 1, 1]) {
      expect(getThrottle("login").remainingAttempts).toBe(budget);
      for (let i = 0; i < budget; i++) {
        recordFailure("login");
      }
      expect(getThrottle("login").locked).toBe(true);
      const raw = window.localStorage.getItem("thanawy:throttle:v1")!;
      const store = JSON.parse(raw) as Record<string, { lockedUntil: number }>;
      store.login!.lockedUntil = Date.now() - 1;
      window.localStorage.setItem("thanawy:throttle:v1", JSON.stringify(store));
    }
  });

  it("login lockout caps at three hours", () => {
    let last = 0;
    for (let round = 0; round < 8; round++) {
      const budget = getThrottle("login").remainingAttempts;
      expect(budget).toBeGreaterThan(0);
      for (let i = 0; i < budget; i++) {
        recordFailure("login");
      }
      const locked = getThrottle("login");
      expect(locked.locked).toBe(true);
      last = locked.remainingMs;
      expect(last).toBeLessThanOrEqual(180 * 60_000);
      const raw = window.localStorage.getItem("thanawy:throttle:v1")!;
      const store = JSON.parse(raw) as Record<string, { lockedUntil: number }>;
      store.login!.lockedUntil = Date.now() - 1;
      window.localStorage.setItem("thanawy:throttle:v1", JSON.stringify(store));
    }
    // Reached the cap: ~180 minutes.
    expect(last).toBeGreaterThan(179 * 60_000);
  });

  it("isolates lockouts per account key", () => {
    for (let i = 0; i < THROTTLE_CONFIGS.login.maxAttempts; i++) {
      recordFailure("login", null, "a@example.com");
    }
    expect(getThrottle("login", "a@example.com").locked).toBe(true);
    expect(getThrottle("login", "b@example.com").locked).toBe(false);
    expect(getThrottle("login", "b@example.com").remainingAttempts).toBe(
      THROTTLE_CONFIGS.login.maxAttempts
    );
    // Unkeyed (legacy) state stays untouched too.
    expect(getThrottle("login").locked).toBe(false);
  });

  it("normalizes the account key (case and whitespace)", () => {
    recordFailure("login", null, "  A@Example.com ");
    expect(getThrottle("login", "a@example.com").remainingAttempts).toBe(
      THROTTLE_CONFIGS.login.maxAttempts - 1
    );
  });

  it("success clears only that account's record", () => {
    recordFailure("login", null, "a@example.com");
    recordFailure("login", null, "b@example.com");
    recordSuccess("login", "a@example.com");
    expect(getThrottle("login", "a@example.com").remainingAttempts).toBe(
      THROTTLE_CONFIGS.login.maxAttempts
    );
    expect(getThrottle("login", "b@example.com").remainingAttempts).toBe(
      THROTTLE_CONFIGS.login.maxAttempts - 1
    );
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

/**
 * Local proof-of-humanity challenge (pure logic; UI lives in
 * `components/auth/HumanCheck.tsx`).
 *
 * HONESTY NOTICE, READ BEFORE "UPGRADING": this is client-side bot
 * FRICTION, not a CAPTCHA security boundary. A script can read this file
 * and solve the arithmetic. Real abuse protection is the backend's HTTP
 * 429 + the escalating lockouts in `attempt-throttle.ts`. This challenge
 * exists only to stop casual automation from burning through the attempt
 * budget at machine speed after repeated failures.
 *
 * UPGRADE PATH to a real CAPTCHA (Cloudflare Turnstile / reCAPTCHA):
 *   1. render the provider widget in `HumanCheck` instead of this puzzle,
 *   2. send its token as an optional `captchaToken` field on the auth
 *      payloads (the Go backend ignores unknown JSON fields today, so add
 *      server-side verification first),
 *   3. treat `captchaRequired: true` in a 400/403 body as "solve again".
 * Until then, nothing here is ever sent to any server.
 */

export interface HumanChallenge {
  /** Opaque id binding an answer to its challenge (replay guard). */
  id: string;
  /** First operand (2..20). */
  a: number;
  /** Second operand (2..20 for `+`; 1..a for `−` so results stay ≥ 0). */
  b: number;
  op: "+" | "−";
  answer: number;
}

/** Arabic prompt text for a challenge, e.g. "كم ناتج ٧ + ٥؟". */
export function challengePromptText(challenge: HumanChallenge): string {
  return `كم ناتج ${challenge.a} ${challenge.op} ${challenge.b}؟`;
}

function randomInt(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/** Generates a fresh challenge. `rand` is injectable for tests. */
export function generateChallenge(rand: () => number = Math.random): HumanChallenge {
  const add = rand() < 0.5;
  const a = randomInt(2, 20, rand);
  if (add) {
    const b = randomInt(2, 20, rand);
    return {
      id: `${Date.now().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`,
      a,
      b,
      op: "+",
      answer: a + b,
    };
  }
  const b = randomInt(1, a, rand);
  return {
    id: `${Date.now().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`,
    a,
    b,
    op: "−",
    answer: a - b,
  };
}

export interface ChallengeSolution {
  challengeId: string;
  /** Raw user input (digits); parsed defensively. */
  input: string;
}

/**
 * Verifies a solution: the id must match (no answering a stale challenge)
 * and the numeric value must equal the expected answer. Non-numeric input
 * is simply wrong, never an exception.
 */
export function verifyChallenge(
  challenge: HumanChallenge,
  solution: ChallengeSolution
): boolean {
  if (!challenge || solution.challengeId !== challenge.id) return false;
  const trimmed = solution.input.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return false;
  return Number(trimmed) === challenge.answer;
}

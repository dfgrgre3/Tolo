/**
 * Client-side mirror of the backend password policy for immediate feedback.
 * The backend remains authoritative and validates every password operation.
 *
 * Single source of truth (auth audit, point 11): the requirement list below
 * drives BOTH validation (`getPasswordPolicyError`) and UX
 * (`getPasswordRequirements`, `getPasswordStrength`, and the shared
 * `PasswordStrengthMeter`). Deriving the error message and the on-screen
 * checklist from the same list is what stops the old drift where the form said
 * "8 characters minimum" while the policy also required uppercase/lowercase/
 * digit/special — a user who followed the hint was then rejected by the server.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRequirement {
  id: string;
  /** Arabic label shown verbatim in the requirements checklist. */
  label: string;
  /** True when `password` satisfies this requirement. */
  test: (password: string) => boolean;
}

const UPPERCASE_RE = /[A-Z]/;
const LOWERCASE_RE = /[a-z]/;
const DIGIT_RE = /\d/;
const SPECIAL_RE = /[^A-Za-z0-9]/;

// A small local list of the most common passwords. This is a UX mirror ONLY —
// real breached-password protection lives server-side (auth audit, point 12):
// the backend must run common-password + breached-password detection and keep
// per-user password history. Never treat this list as a security control, and
// never send candidate passwords to any third-party service from the client.
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "qwerty12", "admin123", "letmein1",
  "welcome1", "password1", "123456789", "1234567890",
]);

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  {
    id: "length",
    label: `بين ${PASSWORD_MIN_LENGTH} و${PASSWORD_MAX_LENGTH} حرفًا`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  { id: "uppercase", label: "حرف كبير واحد على الأقل (A-Z)", test: (p) => UPPERCASE_RE.test(p) },
  { id: "lowercase", label: "حرف صغير واحد على الأقل (a-z)", test: (p) => LOWERCASE_RE.test(p) },
  { id: "digit", label: "رقم واحد على الأقل (0-9)", test: (p) => DIGIT_RE.test(p) },
  { id: "special", label: "رمز خاص واحد على الأقل (!@#$%^&*)", test: (p) => SPECIAL_RE.test(p) },
  {
    id: "notCommon",
    label: "ليست من كلمات المرور الشائعة",
    test: (p) => !COMMON_PASSWORDS.has(p.toLowerCase()),
  },
];

export interface PasswordRequirementCheck extends PasswordRequirement {
  satisfied: boolean;
}

/** Evaluates every requirement against `password`, in checklist display order. */
export function getPasswordRequirements(password: string): PasswordRequirementCheck[] {
  return PASSWORD_REQUIREMENTS.map((req) => ({ ...req, satisfied: req.test(password) }));
}

/**
 * The first unmet requirement as an actionable Arabic message, or null when the
 * whole policy passes. Replaces the old fixed strings that only mentioned the
 * minimum length — the message now always names exactly what the user is
 * missing, so the hint the UI gives matches what the server enforces.
 */
export function getPasswordPolicyError(password: string): string | null {
  const unmet = getPasswordRequirements(password).find((req) => !req.satisfied);
  return unmet ? `كلمة المرور يجب أن: ${unmet.label}` : null;
}

export function isPasswordPolicyValid(password: string): boolean {
  return getPasswordPolicyError(password) === null;
}

// ─── Strength heuristic (UX only) ─────────────────────────────────────────────

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: "ضعيفة جداً" | "ضعيفة" | "متوسطة" | "قوية";
  className: string;
}

const STRENGTH_BY_SCORE: Record<PasswordStrength["score"], Omit<PasswordStrength, "score">> = {
  0: { label: "ضعيفة جداً", className: "bg-destructive" },
  1: { label: "ضعيفة", className: "bg-orange-500" },
  2: { label: "متوسطة", className: "bg-amber-500" },
  3: { label: "قوية", className: "bg-emerald-500" },
};

/**
 * Client-side strength heuristic (length + character variety). Purely a UI hint
 * to sit alongside the requirements checklist — the backend remains the source
 * of truth for password policy. Lives here (not in the profile section) so every
 * password surface renders identical feedback from a single implementation.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, ...STRENGTH_BY_SCORE[0] };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (UPPERCASE_RE.test(password) && LOWERCASE_RE.test(password)) score++;
  if (DIGIT_RE.test(password) && SPECIAL_RE.test(password)) score++;
  const clamped = Math.min(score, 3) as PasswordStrength["score"];
  return { score: clamped, ...STRENGTH_BY_SCORE[clamped] };
}

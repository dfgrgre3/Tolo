import type { UserProfileData } from "./useProfileData";

/** Shared option lists + labels for the profile section. */

export const MAX_NAME_LEN = 80;
export const MAX_USERNAME_LEN = 30;
export const MAX_BIO_LEN = 300;
export const MAX_STUDY_GOAL_LEN = 200;
export const MAX_CITY_LEN = 60;
export const MAX_SCHOOL_LEN = 120;

/**
 * `users.gender` is a free-form `varchar(20)`; these lowercase values match what
 * the admin panel writes (`male`/`female`/`other`) so both surfaces read the
 * same stored strings.
 */
export const GENDERS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
  { value: "other", label: "آخر" },
] as const;

/**
 * Grade values follow the backend convention seen in payloads
 * (e.g. `THIRD_SECONDARY`) — `<ORDINAL>_<STAGE>`.
 */
export const GRADE_LEVELS = [
  { value: "FIRST_PREP", label: "الأول الإعدادي" },
  { value: "SECOND_PREP", label: "الثاني الإعدادي" },
  { value: "THIRD_PREP", label: "الثالث الإعدادي" },
  { value: "FIRST_SECONDARY", label: "الأول الثانوي" },
  { value: "SECOND_SECONDARY", label: "الثاني الثانوي" },
  { value: "THIRD_SECONDARY", label: "الثالث الثانوي" },
] as const;

export const EDUCATION_TYPES = [
  { value: "GENERAL", label: "عام" },
  { value: "ADVANCED", label: "متقدم" },
  { value: "STEM", label: "STEM" },
  { value: "IG", label: "إنجليزي (IG)" },
  { value: "AZHAR", label: "أزهري" },
] as const;

export const SECTIONS = [
  { value: "SCIENTIFIC", label: "علمي" },
  { value: "LITERARY", label: "أدبي" },
] as const;

export const COUNTRIES = [
  { value: "EG", label: "مصر" },
  { value: "SA", label: "السعودية" },
  { value: "AE", label: "الإمارات" },
  { value: "KW", label: "الكويت" },
  { value: "QA", label: "قطر" },
  { value: "JO", label: "الأردن" },
  { value: "PS", label: "فلسطين" },
  { value: "LB", label: "لبنان" },
  { value: "IQ", label: "العراق" },
  { value: "MA", label: "المغرب" },
  { value: "DZ", label: "الجزائر" },
  { value: "TN", label: "تونس" },
  { value: "LY", label: "ليبيا" },
  { value: "SD", label: "السودان" },
  { value: "YE", label: "اليمن" },
  { value: "OM", label: "عمان" },
  { value: "BH", label: "البحرين" },
  { value: "TR", label: "تركيا" },
  { value: "US", label: "أمريكا" },
  { value: "GB", label: "بريطانيا" },
  { value: "CA", label: "كندا" },
  { value: "OTHER", label: "دولة أخرى" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: "طالب",
  PREMIUM: "طالب مميز",
  TEACHER: "معلم",
  MODERATOR: "مشرف",
  ADMIN: "مسؤول",
  SUPER_ADMIN: "مسؤول عام",
};

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** Formats an ISO date as a readable Arabic date, or null when missing/invalid. */
export function formatArabicDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: "ضعيفة جداً" | "ضعيفة" | "متوسطة" | "قوية";
  className: string;
}

/**
 * Client-side strength heuristic (length + character variety). Purely a UI
 * hint — the backend remains the source of truth for password policy.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "ضعيفة جداً", className: "bg-destructive" };
  }
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 3) as PasswordStrength["score"];
  const byScore: Record<PasswordStrength["score"], Omit<PasswordStrength, "score">> = {
    0: { label: "ضعيفة جداً", className: "bg-destructive" },
    1: { label: "ضعيفة", className: "bg-orange-500" },
    2: { label: "متوسطة", className: "bg-amber-500" },
    3: { label: "قوية", className: "bg-emerald-500" },
  };
  return { score: clamped, ...byScore[clamped] };
}

/**
 * Fields counted toward profile completeness with human-readable hints.
 * Checked against `GET /api/users/profile` (`UserProfileData`), not the
 * auth context — `/auth/me` doesn't return bio/phone/country/gradeLevel/
 * educationType/dateOfBirth/studyGoal at all, which would make every one of
 * these permanently show as "missing" regardless of the real data.
 */
export const COMPLETENESS_FIELDS: {
  key: string;
  label: string;
  href?: string;
  check: (profile: UserProfileData) => boolean;
}[] = [
  { key: "avatar", label: "صورة شخصية", check: (p) => Boolean(p.avatar) },
  { key: "bio", label: "نبذة قصيرة", check: (p) => Boolean(p.bio && p.bio.trim().length > 0) },
  { key: "phone", label: "رقم هاتف موثّق", check: (p) => Boolean(p.phone && p.phoneVerified) },
  { key: "country", label: "الدولة", check: (p) => Boolean(p.country) },
  { key: "gradeLevel", label: "الصف الدراسي", check: (p) => Boolean(p.gradeLevel) },
  { key: "educationType", label: "نوع التعليم", check: (p) => Boolean(p.educationType) },
  { key: "dateOfBirth", label: "تاريخ الميلاد", check: (p) => Boolean(p.dateOfBirth) },
  { key: "studyGoal", label: "هدف دراسي", check: (p) => Boolean(p.studyGoal) },
];

/**
 * Tab identifiers, shared by `page.tsx` (deep links via `?tab=`) and by any
 * component that links into a sibling section.
 */
export const PROFILE_TABS = [
  "overview",
  "account",
  "security",
  "notifications",
  "privacy",
  "activity",
  "achievements",
  "learning",
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export function normalizeProfileTab(raw: string | null): ProfileTab {
  return (PROFILE_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as ProfileTab)
    : "overview";
}

/**
 * Achievement rarity → Arabic label + badge classes. `/gamification/achievements`
 * returns rarity as a lowercase-ish free string, so lookups are normalized and
 * fall back to the common style instead of rendering an empty badge.
 */
const DEFAULT_RARITY_STYLE = {
  label: "عادي",
  className: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const RARITY_STYLES: Record<string, { label: string; className: string }> = {
  common: DEFAULT_RARITY_STYLE,
  rare: { label: "نادر", className: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  epic: { label: "أسطوري", className: "bg-purple-500/10 text-purple-600 dark:text-purple-300" },
  legendary: { label: "خارق", className: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
};

export function rarityStyle(rarity?: string | null) {
  return RARITY_STYLES[(rarity ?? "").toLowerCase()] ?? DEFAULT_RARITY_STYLE;
}

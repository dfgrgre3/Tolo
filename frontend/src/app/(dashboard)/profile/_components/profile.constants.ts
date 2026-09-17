import type { UserProfileData } from "./useProfileData";

/** Shared option lists + labels for the profile section. */

export const MAX_NAME_LEN = 80;
export const MAX_USERNAME_LEN = 30;
export const MAX_BIO_LEN = 300;
export const MAX_STUDY_GOAL_LEN = 200;
export const MAX_CITY_LEN = 60;
export const MAX_SCHOOL_LEN = 120;
export const MIN_ACCOUNT_AGE = 13;
export const MAX_ACCOUNT_AGE = 120;
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "moderator", "teacher",
]);

/** Date-only validation; deliberately avoids timezone-dependent Date parsing. */
export function isValidBirthDate(value: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return false;
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  let age = today.getFullYear() - year;
  if (value.slice(5) > todayKey.slice(5)) age--;
  return value <= todayKey && age >= MIN_ACCOUNT_AGE && age <= MAX_ACCOUNT_AGE;
}

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

// Password strength lives in the shared `password-policy` module so the profile
// meter and the auth flows (register / reset-password / change-password) render
// identical feedback from a single implementation. Re-exported here to keep the
// existing `./profile.constants` import path working.
export { getPasswordStrength, type PasswordStrength } from "@/lib/auth/password-policy";

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

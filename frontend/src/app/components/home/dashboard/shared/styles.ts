import { type ClassValue } from "clsx";

// ============================================================================
// Shared style tokens for the dashboard UI — Noon-style: flat, light,
// bold-color cards instead of dark glass/neon.
// ============================================================================

/** Reusable CSS class strings for the dashboard UI. */
export const rpgCommonStyles = {
  /** Primary card style: plain white card, subtle border and shadow. */
  card: "rounded-2xl border border-border bg-card shadow-sm",
  /** Prominent panel, e.g. the hero header — solid brand-color surface, no blur/glass. */
  glassPanel: "relative rounded-3xl bg-primary text-primary-foreground p-6 md:p-10 shadow-lg",
  /** Bold brand-color text (was "neon"). Contrast-safe darker orange. */
  neonText: "text-primary-strong",
  /** Bold amber/gold accent text, used for streaks and rewards. */
  goldText: "text-amber-700 dark:text-amber-400",
} as const;

/**
 * Maps subject names (Arabic or English) to their emoji representation
 * for the exams section UI.
 */
export const SUBJECT_EMOJIS: Record<string, string> = {
  // Arabic subjects
  "رياضيات": "🔢",
  "الرياضيات": "🔢",
  "فيزياء": "⚡",
  "الفيزياء": "⚡",
  "كيمياء": "🧪",
  "الكيمياء": "🧪",
  "أحياء": "🧬",
  "الأحياء": "🧬",
  "عربي": "📝",
  "اللغة العربية": "📝",
  "لغة عربية": "📝",
  "english": "🇬🇧",
  "English": "🇬🇧",
  "لغة انجليزية": "🇬🇧",
  "اللغة الانجليزية": "🇬🇧",
  "فرنساوي": "🥖",
  "فرنسية": "🥖",
  "الفرنسية": "🥖",
  "تاريخ": "📜",
  "التاريخ": "📜",
  "جغرافيا": "🌍",
  "الجغرافيا": "🌍",
  "فلسفة": "🤔",
  "الفلسفة": "🤔",
  "علوم": "🔬",
  "العلوم": "🔬",
  "دراسات": "🏛️",
  "الدراسات": "🏛️",
  "دين": "🕌",
  "تربية دينية": "🕌",
  "تربية اسلامية": "🕌",
  "حاسب آلي": "💻",
  "حاسب الي": "💻",
  "كمبيوتر": "💻",
  // Default fallback
  "عام": "⚔️",
};

/** Default emoji used when a subject is not found in SUBJECT_EMOJIS. */
export const DEFAULT_SUBJECT_EMOJI = "⚔️";

/** Utility to merge Tailwind classes (re-export for convenience). */
export function cn(...inputs: ClassValue[]) {
  // Inline minimal implementation to avoid extra dependency
  return inputs
    .flat()
    .filter(Boolean)
    .map((input) => {
      if (typeof input === "string") return input;
      if (typeof input === "object" && input !== null) {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return "";
    })
    .join(" ")
    .trim();
}
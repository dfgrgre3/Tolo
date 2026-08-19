import { type ClassValue } from "clsx";

// ============================================================================
// Common RPG-themed styles used across dashboard sections.
// ============================================================================

/** Reusable CSS class strings for the RPG-themed dashboard UI. */
export const rpgCommonStyles = {
  /** Primary card style with glass effect. */
  card: "rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-xl",
  /** Glass panel with a more prominent background. */
  glassPanel: "relative rounded-3xl border border-white/10 bg-black/20 backdrop-blur-md p-6 md:p-10 shadow-2xl",
  /** Neon text effect (primary color). */
  neonText: "text-transparent bg-clip-text bg-gradient-to-l from-primary via-purple-400 to-primary",
  /** Gold text effect. */
  goldText: "text-transparent bg-clip-text bg-gradient-to-l from-yellow-300 via-amber-400 to-yellow-500",
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
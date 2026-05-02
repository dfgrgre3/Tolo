// Types and constants for achievements
export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  xpReward: number;
  isSecret: boolean;
  category: string;
  difficulty: string;
  unlockedCount: number;
  createdAt: string;
  _count: {
    users: number;
  };
}

export const rarityOptions = [
  { value: "common", label: "أساسي" },
  { value: "uncommon", label: "برونزي" },
  { value: "rare", label: "فضي" },
  { value: "epic", label: "ذهبي" },
  { value: "legendary", label: "بلاتيني" },
];

export const categoryOptions = [
  { value: "STUDY", label: "نشاط دراسي" },
  { value: "TASKS", label: "إتمام مهام" },
  { value: "EXAMS", label: "اختبارات" },
  { value: "TIME", label: "وقت المذاكرة" },
  { value: "STREAK", label: "استمرارية" },
];

export const difficultyOptions = [
  { value: "EASY", label: "مبتدئ" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HARD", label: "متقدم" },
  { value: "EXPERT", label: "خبير" },
];

export const rarityColors: Record<string, string> = {
  common: "bg-slate-500",
  uncommon: "bg-orange-600",
  rare: "bg-zinc-400",
  epic: "bg-amber-500",
  legendary: "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]",
};

export const rarityLabels: Record<string, string> = {
  common: "أساسي",
  uncommon: "برونزي",
  rare: "فضي",
  epic: "ذهبي",
  legendary: "بلاتيني",
};

export const categoryLabels: Record<string, string> = {
  STUDY: "نشاط دراسي",
  TASKS: "إتمام مهام",
  EXAMS: "اختبارات",
  TIME: "وقت المذاكرة",
  STREAK: "استمرارية",
};

export const difficultyLabels: Record<string, string> = {
  EASY: "مبتدئ",
  MEDIUM: "متوسط",
  HARD: "متقدم",
  EXPERT: "خبير",
};

// Utility functions
export function getRarityLabel(rarity: string): string {
  return rarityLabels[rarity] || rarity;
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}

export function getDifficultyLabel(difficulty: string): string {
  return difficultyLabels[difficulty] || difficulty;
}

export function formatXpReward(xp: number): string {
  return `${xp} نقطة`;
}

export function formatUserCount(count: number): string {
  return `${count} مستخدم`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ar-EG");
}

export function getRarityOrder(rarity: string): number {
  const order = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  return order[rarity as keyof typeof order] || 0;
}

export function getDifficultyOrder(difficulty: string): number {
  const order = { EASY: 1, MEDIUM: 2, HARD: 3, EXPERT: 4 };
  return order[difficulty as keyof typeof order] || 0;
}

// Validation helpers
export function validateAchievementKey(key: string): boolean {
  return /^[A-Z_]+$/.test(key);
}

export function validateXpReward(xp: number): boolean {
  return Number.isInteger(xp) && xp >= 0 && xp <= 10000;
}

// Default values
export const defaultAchievementForm = {
  key: "",
  title: "",
  description: "",
  icon: "award",
  rarity: "common" as const,
  xpReward: 10,
  isSecret: false,
  category: "STUDY" as const,
  difficulty: "EASY" as const,
};

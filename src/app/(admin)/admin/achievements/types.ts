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
  { value: "common", label: "عادي" },
  { value: "uncommon", label: "غير عادي" },
  { value: "rare", label: "نادر" },
  { value: "epic", label: "ملحمي" },
  { value: "legendary", label: "أسطوري" },
];

export const categoryOptions = [
  { value: "STUDY", label: "دراسة" },
  { value: "TASKS", label: "مهام" },
  { value: "EXAMS", label: "امتحانات" },
  { value: "TIME", label: "وقت" },
  { value: "STREAK", label: "تتابع" },
];

export const difficultyOptions = [
  { value: "EASY", label: "سهل" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HARD", label: "صعب" },
  { value: "EXPERT", label: "خبير" },
];

export const rarityColors: Record<string, string> = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
};

export const rarityLabels: Record<string, string> = {
  common: "عادي",
  uncommon: "غير عادي",
  rare: "نادر",
  epic: "ملحمي",
  legendary: "أسطوري",
};

export const categoryLabels: Record<string, string> = {
  STUDY: "دراسة",
  TASKS: "مهام",
  EXAMS: "امتحانات",
  TIME: "وقت",
  STREAK: "تتابع",
};

export const difficultyLabels: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
  EXPERT: "خبير",
};

// Utility functions
export function getRarityLabel(rarity: string): string {
  const option = rarityOptions.find(opt => opt.value === rarity);
  return option?.label || rarity;
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}

export function getDifficultyLabel(difficulty: string): string {
  return difficultyLabels[difficulty] || difficulty;
}

export function formatXpReward(xp: number): string {
  return `${xp} XP`;
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
  icon: "trophy",
  rarity: "common" as const,
  xpReward: 10,
  isSecret: false,
  category: "STUDY" as const,
  difficulty: "EASY" as const,
};

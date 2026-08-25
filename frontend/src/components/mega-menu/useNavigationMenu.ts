"use client";

import { useState, useEffect, useCallback } from "react";
import { navigationApi, type BackendNavCategory, type MegaMenuCategory } from "@/lib/api/navigation-api";
import { logger } from "@/lib/logger";
import {
  BookOpen,
  Award,
  Clock,
  Target,
  Library,
  Lightbulb,
  BarChart3,
  Trophy,
  Users,
  GraduationCap,
  CreditCard,
  Settings,
  Calendar,
  BookMarked,
  FileText,
  FolderOpen,
  Gamepad2,
  Home,
  History,
  Sparkles,
  Star,
  TrendingUp,
  Bell,
  Activity,
  Shield,
  MessageSquare,
  Megaphone,
  Brain,
  type LucideIcon,
} from "lucide-react";

// Icon name to component mapping
const ICON_MAP: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  "award": Award,
  "clock": Clock,
  "target": Target,
  "library": Library,
  "lightbulb": Lightbulb,
  "bar-chart": BarChart3,
  "bar_chart": BarChart3,
  "trophy": Trophy,
  "users": Users,
  "graduation-cap": GraduationCap,
  "graduation_cap": GraduationCap,
  "credit-card": CreditCard,
  "credit_card": CreditCard,
  "settings": Settings,
  "calendar": Calendar,
  "book-marked": BookMarked,
  "book_marked": BookMarked,
  "file-text": FileText,
  "file_text": FileText,
  "folder-open": FolderOpen,
  "folder_open": FolderOpen,
  "gamepad": Gamepad2,
  "gamepad2": Gamepad2,
  "home": Home,
  "history": History,
  "sparkles": Sparkles,
  "star": Star,
  "trending-up": TrendingUp,
  "trending_up": TrendingUp,
  "bell": Bell,
  "shield": Shield,
  "activity": Activity,
  "message-square": MessageSquare,
  "message_square": MessageSquare,
  "megaphone": Megaphone,
  "brain": Brain,
  "user-plus": Users,
  "user_plus": Users,
};

function iconFromName(name?: string): LucideIcon {
  if (!name) return Sparkles;
  return ICON_MAP[name] || Sparkles;
}

// Transform backend nav category to MegaMenuCategory
function transformBackendCategory(cat: BackendNavCategory): MegaMenuCategory {
  return {
    id: cat.id,
    title: cat.title,
    slug: cat.slug,
    items: Array.isArray(cat.items)
      ? cat.items.map((item) => ({
          href: item.href,
          label: item.label,
          icon: iconFromName(item.icon),
          description: item.description,
          badge: item.badge,
        }))
      : [],
    isPriority: cat.isPriority,
    priorityLabel: cat.priorityLabel,
  };
}

export function useNavigationMenu() {
  const [categories, setCategories] = useState<MegaMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNavigation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const menu = await navigationApi.getMenuWithCache();
      const categories = Array.isArray(menu?.categories) ? menu.categories : [];
      setCategories(categories.map(transformBackendCategory));
    } catch (err) {
      logger.error('Failed to fetch navigation menu:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch navigation'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchNavigation();
    });
  }, [fetchNavigation]);

  return {
    categories,
    loading,
    error,
    refetch: fetchNavigation,
  };
}

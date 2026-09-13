import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  History,
  Home,
  Library,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { logger } from "@/lib/logger";

const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  award: Award,
  "bar-chart": BarChart3,
  "bar-chart-3": BarChart3,
  bell: Bell,
  "book-marked": BookMarked,
  "book-open": BookOpen,
  brain: Brain,
  calendar: Calendar,
  "check-circle": CheckCircle,
  "clipboard-list": ClipboardList,
  clock: Clock,
  "credit-card": CreditCard,
  download: Download,
  "file-text": FileText,
  "folder-open": FolderOpen,
  gamepad: Gamepad2,
  "gamepad-2": Gamepad2,
  "graduation-cap": GraduationCap,
  home: Home,
  history: History,
  library: Library,
  lightbulb: Lightbulb,
  megaphone: Megaphone,
  "message-square": MessageSquare,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  "trending-up": TrendingUp,
  trophy: Trophy,
  upload: Upload,
  "user-plus": UserPlus,
  users: Users,
};

const FALLBACK_ICON = HelpCircle;

export function getNavigationIcon(name?: string): LucideIcon {
  if (!name?.trim()) {
    logger.warn("Navigation item is missing an icon name");
    return FALLBACK_ICON;
  }

  const normalized = name.trim().toLowerCase().replaceAll("_", "-");
  const icon = ICON_MAP[normalized];

  if (!icon) {
    logger.warn("Unknown navigation icon; using fallback", { icon: name });
    return FALLBACK_ICON;
  }

  return icon;
}

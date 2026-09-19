import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BellRing,
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
  Lock,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  UserCircle2,
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
  "bell-ring": BellRing,
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
  lock: Lock,
  megaphone: Megaphone,
  "message-square": MessageSquare,
  "monitor-smartphone": MonitorSmartphone,
  settings: Settings,
  shield: Shield,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  "trending-up": TrendingUp,
  trophy: Trophy,
  upload: Upload,
  "user-circle": UserCircle2,
  "user-plus": UserPlus,
  users: Users,
};

const FALLBACK_ICON = HelpCircle;

/**
 * Resolves a backend icon name (kebab-case, e.g. "book-open") to its Lucide
 * component. This is the ONLY icon registry for navigation — the static
 * fallback menu in navData.ts resolves through it too, so an offline/cold-start
 * render shows the same glyphs the API-served menu would.
 */
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

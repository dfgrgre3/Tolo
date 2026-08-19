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
  Home,
  History,
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
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "activity": Activity,
  "award": Award,
  "bar-chart": BarChart3,
  "bar-chart-3": BarChart3,
  "bell": Bell,
  "book-marked": BookMarked,
  "book-open": BookOpen,
  "brain": Brain,
  "calendar": Calendar,
  "check-circle": CheckCircle,
  "clipboard-list": ClipboardList,
  "clock": Clock,
  "credit-card": CreditCard,
  "download": Download,
  "file-text": FileText,
  "folder-open": FolderOpen,
  "gamepad": Gamepad2,
  "gamepad-2": Gamepad2,
  "graduation-cap": GraduationCap,
  "home": Home,
  "history": History,
  "library": Library,
  "lightbulb": Lightbulb,
  "megaphone": Megaphone,
  "message-square": MessageSquare,
  "settings": Settings,
  "shield": Shield,
  "sparkles": Sparkles,
  "star": Star,
  "target": Target,
  "trending-up": TrendingUp,
  "trophy": Trophy,
  "upload": Upload,
  "user-plus": UserPlus,
  "users": Users,
};

export function getLucideIcon(name?: string): LucideIcon {
  if (!name) return HelpCircle;
  
  const normalized = name.toLowerCase().trim();
  
  // Try exact match
  if (iconMap[normalized]) {
    return iconMap[normalized]!;
  }
  
  // Try camelCase/kebab-case mappings
  const camelized = normalized.replace(/-([a-z0-9])/g, (g) => g[1]!.toUpperCase());
  if (iconMap[camelized]) {
    return iconMap[camelized]!;
  }

  return HelpCircle;
}

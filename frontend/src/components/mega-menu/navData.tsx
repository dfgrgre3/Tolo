import type { LucideIcon } from "lucide-react";
import { getNavigationIcon } from "./navigationIconMapper";
import type { MegaMenuCategory, NavItem } from "./types";

export interface NavItemWithMegaMenu {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
  megaMenu?: MegaMenuCategory[];
}

// ─────────────────────────────────────────────────────────────────────
// Static fallback menu
// ─────────────────────────────────────────────────────────────────────
// Described with the SAME slugs, hrefs, labels, icon names, menuKey and
// columnKey the backend serves from GET /api/v1/navigation/menu, and resolved
// through the same icon registry. This is NOT a second source of truth for
// "what the menu contains" — it is a byte-faithful mirror used so that:
//
//   1. The header renders the full navigation on the FIRST paint, before the
//      network resolves (no empty nav bar / layout shift on cold loads).
//   2. A backend restart, cold start, or short outage degrades to an
//      identical menu instead of an empty or visibly different one.
//
// When the menu structure changes on the backend, update it here too. The two
// are deliberately kept in sync by hand rather than generated, so the header
// keeps working with zero network dependency.

type MenuKey = "all-features" | "schools";

interface FallbackNavItem {
  href: string;
  label: string;
  /** Backend icon name (kebab-case); resolved through the shared registry. */
  icon: string;
  description?: string;
  badge?: string;
}

interface FallbackCategory {
  title: string;
  slug: string;
  menuKey: MenuKey;
  columnKey: string;
  items: FallbackNavItem[];
}

const FALLBACK_CATEGORIES: FallbackCategory[] = [
  {
    title: "الدراسة والتعلم",
    slug: "study",
    menuKey: "all-features",
    columnKey: "study",
    items: [
      { href: "/courses", label: "جميع الدورات", description: "استعرض كل الدورات التعليمية المتاحة", icon: "book-open" },
      { href: "/my-courses", label: "دوراتي", description: "الدورات والمسارات التي تتابعها حالياً", icon: "book-marked" },
      { href: "/teachers", label: "المدرسون", description: "تواصل مع نخبة من أفضل المدرسين", icon: "graduation-cap" },
    ],
  },
  {
    title: "التقييمات والامتحانات",
    slug: "exams",
    menuKey: "all-features",
    columnKey: "study",
    items: [
      { href: "/exams", label: "الامتحانات والتقييم", description: "الاختبارات الدورية وقياس المستوى المباشر", icon: "clipboard-list" },
      { href: "/teacher-exams", label: "اختبارات المدرسين", description: "بنك أسئلة واختبارات خاصة بمدرسي المنصة", icon: "file-text" },
    ],
  },
  {
    title: "تنظيم الوقت",
    slug: "time_management",
    menuKey: "all-features",
    columnKey: "planning",
    items: [
      { href: "/schedule", label: "جدول المحاضرات", description: "جدول الحصص المباشرة والدروس الأسبوعية", icon: "calendar" },
      { href: "/time", label: "إدارة الوقت", description: "أدوات لتنظيم ساعات الاستذكار والتركيز", icon: "clock" },
    ],
  },
  {
    title: "التخطيط والأهداف",
    slug: "goals",
    menuKey: "all-features",
    columnKey: "planning",
    items: [
      { href: "/ai", label: "التخطيط والأهداف", description: "خطط دراستك ونظّم أهدافك التعليمية", icon: "target" },
      { href: "/tasks", label: "قائمة المهام", description: "متابعة الواجبات والمهام الدراسية اليومية", icon: "book-marked" },
      { href: "/goals", label: "تحديد الأهداف", description: "وضع أهداف دراسية أسبوعية وشهرية ومتابعتها", icon: "target" },
    ],
  },
  {
    title: "المحتوى التعليمي",
    slug: "digital_library",
    menuKey: "all-features",
    columnKey: "content",
    items: [
      { href: "/library", label: "المكتبة الرقمية", description: "مستودع الكتب والملخصات والملفات التعليمية", icon: "library" },
      { href: "/resources", label: "الموارد والتحميلات", description: "مركز تحميل المستندات والمذكرات الدراسية", icon: "folder-open" },
    ],
  },
  {
    title: "المحتوى التثقيفي",
    slug: "awareness",
    menuKey: "all-features",
    columnKey: "content",
    items: [
      { href: "/blog", label: "المدونة التعليمية", description: "مقالات ومشاركات تثقيفية من المعلمين والطلاب", icon: "file-text" },
    ],
  },
  {
    title: "لوحة التحكم والأداء",
    slug: "dashboard",
    menuKey: "all-features",
    columnKey: "performance",
    items: [
      { href: "/analytics", label: "لوحة تحليلات الأداء", description: "تحليلات مفصلة لمستوى دراستك ونقاط قوتك", icon: "bar-chart" },
      { href: "/academy", label: "الأكاديمية", description: "نظرة عامة على الأداء الأكاديمي العام", icon: "graduation-cap" },
    ],
  },
  {
    title: "التنافس والترتيب",
    slug: "leaderboard",
    menuKey: "all-features",
    columnKey: "performance",
    items: [
      { href: "/leaderboard", label: "لوحة الصدارة", description: "ترتيب الطلاب الأوائل والمنافسين على المنصة", icon: "trophy" },
      { href: "/contests/new", label: "تحدي جديد", description: "إنشاء مسابقة وتحدي دراسي جديد مع زملائك", icon: "gamepad" },
      { href: "/events", label: "الأحداث والفعاليات", description: "المشاركة في المسابقات والفعاليات الرسمية", icon: "sparkles" },
    ],
  },
  {
    title: "التواصل والمشاركة",
    slug: "community",
    menuKey: "all-features",
    columnKey: "community",
    items: [
      { href: "/chat", label: "الدردشة الجماعية", description: "غرف دردشة حية لمناقشة الدروس مع زملائك", icon: "users" },
      { href: "/forum", label: "منتدى النقاش", description: "طرح الأسئلة ومشاركة الإجابات مع مجتمع الطلاب", icon: "message-square" },
      { href: "/announcements", label: "إعلانات المنصة", description: "آخر الأخبار والتحديثات الرسمية الهامة", icon: "megaphone" },
    ],
  },
  {
    title: "الحساب والاشتراك",
    slug: "subscription",
    menuKey: "all-features",
    columnKey: "account",
    items: [
      { href: "/subscription", label: "الاشتراكات المتاحة", description: "استعرض باقات الاشتراك وقم بالترقية", icon: "credit-card" },
      { href: "/billing", label: "إدارة الفواتير", description: "المدفوعات، الفواتير، وطرق الدفع المحفوظة", icon: "credit-card" },
      { href: "/billing/referrals", label: "برنامج الإحالة", description: "دعوة أصدقائك والحصول على مكافآت ونقاط مجانية", icon: "user-plus" },
    ],
  },
  {
    title: "الإعدادات والأمان",
    slug: "settings",
    menuKey: "all-features",
    columnKey: "account",
    items: [
      { href: "/settings", label: "الإعدادات العامة", description: "تخصيص الملف الشخصي والمظهر والتفضيلات", icon: "settings" },
      { href: "/settings/privacy", label: "الخصوصية والظهور", description: "التحكم في بياناتك وظهورك لزملائك", icon: "shield" },
      { href: "/settings/security", label: "الأمان والوصول", description: "تغيير كلمة المرور وتفعيل حماية الحساب", icon: "shield" },
      { href: "/settings/security/logs", label: "سجل النشاط", description: "عرض تفاصيل وسجلات الدخول لحسابك", icon: "history" },
      { href: "/settings/devices", label: "الأجهزة المتصلة", description: "إدارة الأجهزة النشطة التي تستخدم حسابك", icon: "activity" },
      { href: "/settings/notifications", label: "تفضيلات الإشعارات", description: "تحديد كيفية ووقت تلقي التنبيهات", icon: "bell" },
    ],
  },
  {
    title: "المرحلة الابتدائية",
    slug: "primary",
    menuKey: "schools",
    columnKey: "schools",
    items: [
      { href: "/schools/primary/4", label: "الصف الرابع الابتدائي", description: "مناهج ومواد الصف الرابع الابتدائي", icon: "graduation-cap" },
      { href: "/schools/primary/5", label: "الصف الخامس الابتدائي", description: "مناهج ومواد الصف الخامس الابتدائي", icon: "graduation-cap" },
      { href: "/schools/primary/6", label: "الصف السادس الابتدائي", description: "مناهج ومواد الصف السادس الابتدائي", icon: "graduation-cap" },
    ],
  },
  {
    title: "المرحلة الإعدادية",
    slug: "middle",
    menuKey: "schools",
    columnKey: "schools",
    items: [
      { href: "/schools/middle/1", label: "الصف الأول الإعدادي", description: "مناهج ومواد الصف الأول الإعدادي", icon: "graduation-cap" },
      { href: "/schools/middle/2", label: "الصف الثاني الإعدادي", description: "مناهج ومواد الصف الثاني الإعدادي", icon: "graduation-cap" },
      { href: "/schools/middle/3", label: "الصف الثالث الإعدادي", description: "مناهج ومواد الصف الثالث الإعدادي", icon: "graduation-cap" },
    ],
  },
  {
    title: "المرحلة الثانوية",
    slug: "high_school",
    menuKey: "schools",
    columnKey: "schools",
    items: [
      { href: "/schools/secondary/1", label: "الصف الأول الثانوي", description: "مناهج ومواد الصف الأول الثانوي", icon: "graduation-cap" },
      { href: "/schools/secondary/2", label: "الصف الثاني الثانوي", description: "مناهج ومواد الصف الثاني الثانوي", icon: "graduation-cap" },
      { href: "/schools/secondary/3", label: "الصف الثالث الثانوي", description: "مناهج ومواد الصف الثالث الثانوي", icon: "graduation-cap" },
    ],
  },
];

function resolveItem(item: FallbackNavItem): NavItem {
  return {
    href: item.href,
    label: item.label,
    icon: getNavigationIcon(item.icon),
    description: item.description,
    badge: item.badge,
  };
}

function resolveCategories(menuKey: MenuKey): MegaMenuCategory[] {
  return FALLBACK_CATEGORIES
    .filter((category) => category.menuKey === menuKey)
    .map((category) => ({
      title: category.title,
      slug: category.slug,
      menuKey: category.menuKey,
      columnKey: category.columnKey,
      items: category.items.map(resolveItem),
    }));
}

/**
 * Main navigation row (second header row). Mirrors the backend's `menus`
 * entries minus "/" (the logo already links home) and "/schools" (rendered
 * in the first header row).
 */
export const mainNavItemsWithMegaMenu: NavItemWithMegaMenu[] = [
  {
    href: "/all-features",
    label: "المزيد",
    icon: getNavigationIcon("sparkles"),
    description: "المزيد من الخيارات والأدوات",
    megaMenu: resolveCategories("all-features"),
  },
];

/**
 * First-row header menu (the schools mega menu trigger next to the search).
 */
export const headerNavItems: NavItemWithMegaMenu[] = [
  {
    href: "/schools",
    label: "مدارس",
    icon: getNavigationIcon("graduation-cap"),
    description: "المراحل التعليمية",
    megaMenu: resolveCategories("schools"),
  },
];

export interface UtilityNavItem {
  href: string;
  label: string;
  position: "left" | "right";
}

/**
 * Standalone header links that are not part of the mega-menu navigation.
 * These are brand/marketing links owned by the frontend, not catalog data —
 * they stay static here so they live next to the rest of the nav config
 * instead of being hard-coded inside Header.tsx.
 */
export const utilityNavItems: UtilityNavItem[] = [
  { href: "/teach", label: "التدريس على Tolo", position: "left" },
  { href: "/jobs", label: "وظائف Tolo", position: "left" },
  { href: "/plans", label: "الخطط", position: "right" },
];

/**
 * أيقونات الروابط السريعة (نفس أسماء الأيقونات التي يرسلها الـ backend
 * لعنصري التدريس على Tolo ووظائف Tolo في GET /api/v1/navigation/menu).
 */
const QUICK_LINK_ICON_NAMES: Record<string, string> = {
  "/teach": "presentation",
  "/jobs": "briefcase",
};

/**
 * روابط سريعة تُعرض داخل القائمة الجانبية للموبايل أسفل عناصر التنقل.
 * نفس روابط الصف الأول على الديسكتوب (position === "left")، لكن هنا
 * بأيقونات لأن القائمة الجانبية ترسم أيقونة لكل عنصر. بدونها لا يظهر
 * "التدريس على Tolo" و"وظائف Tolo" على الهاتف إطلاقاً، لأن الديسكتوب
 * يخفيهما داخل `hidden lg:*`.
 */
export const mobileQuickNavItems: NavItemWithMegaMenu[] = utilityNavItems
  .filter((item) => item.position === "left")
  .map((item) => ({
    href: item.href,
    label: item.label,
    icon: getNavigationIcon(QUICK_LINK_ICON_NAMES[item.href] ?? "sparkles"),
  }));

import {
  BarChart3,
  BellRing,
  BookMarked,
  BookOpen,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  Gamepad2,
  GraduationCap,
  History,
  Lightbulb,
  Library,
  Lock,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserCircle2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MegaMenuCategory } from "./types";

export interface NavItemWithMegaMenu {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
  megaMenu?: MegaMenuCategory[];
  /** Backend category slugs that may replace this item's static fallback menu. */
  backendCategorySlugs?: string[];
}

export const coursesMegaMenu: MegaMenuCategory[] = [
  {
    title: "الدراسة والتعليم",
    slug: "study",
    items: [
      { href: "/courses", label: "جميع الدورات", icon: BookOpen, description: "استعرض كل الدورات التعليمية المتاحة" },
    ],
  },
];

export const schoolsMegaMenu: MegaMenuCategory[] = [
  {
    title: "المرحلة الابتدائية",
    slug: "primary",
    columnKey: "schools",
    items: [
      { href: "/schools/primary/4", label: "الصف الرابع الابتدائي", icon: GraduationCap, description: "مناهج ومواد الصف الرابع الابتدائي" },
      { href: "/schools/primary/5", label: "الصف الخامس الابتدائي", icon: GraduationCap, description: "مناهج ومواد الصف الخامس الابتدائي" },
      { href: "/schools/primary/6", label: "الصف السادس الابتدائي", icon: GraduationCap, description: "مناهج ومواد الصف السادس الابتدائي" },
    ],
  },
  {
    title: "المرحلة الإعدادية",
    slug: "middle",
    columnKey: "schools",
    items: [
      { href: "/schools/middle/1", label: "الصف الأول الإعدادي", icon: GraduationCap, description: "مناهج ومواد الصف الأول الإعدادي" },
      { href: "/schools/middle/2", label: "الصف الثاني الإعدادي", icon: GraduationCap, description: "مناهج ومواد الصف الثاني الإعدادي" },
      { href: "/schools/middle/3", label: "الصف الثالث الإعدادي", icon: GraduationCap, description: "مناهج ومواد الصف الثالث الإعدادي" },
    ],
  },
  {
    title: "المرحلة الثانوية",
    slug: "high_school",
    columnKey: "schools",
    items: [
      { href: "/schools/secondary/1", label: "الصف الأول الثانوي", icon: GraduationCap, description: "مناهج ومواد الصف الأول الثانوي" },
      { href: "/schools/secondary/2", label: "الصف الثاني الثانوي", icon: GraduationCap, description: "مناهج ومواد الصف الثاني الثانوي" },
      { href: "/schools/secondary/3", label: "الصف الثالث الثانوي", icon: GraduationCap, description: "مناهج ومواد الصف الثالث الثانوي" },
    ],
  },
];

export const moreMegaMenu: MegaMenuCategory[] = [
  {
    title: "الدراسة والتعلم",
    slug: "study_and_education",
    columnKey: "study",
    items: [
      { href: "/courses", label: "جميع الدورات", icon: BookOpen, description: "استعرض كل الدورات التعليمية المتاحة" },
      { href: "/my-courses", label: "دوراتي", icon: BookMarked, description: "تابع الدورات التي انضممت إليها وتقدمك الدراسي" },
      { href: "/teachers", label: "المدرسون", icon: GraduationCap, description: "تواصل مع نخبة من أفضل المدرسين" },
      { href: "/exams", label: "التقييمات والامتحانات", icon: ClipboardList, description: "تابع تقييماتك وامتحاناتك الدراسية" },
      { href: "/exams", label: "الامتحانات والتقييم", icon: ClipboardList, description: "الاختبارات الدورية وقياس المستوى المباشر" },
      { href: "/teacher-exams", label: "اختبارات المدرسين", icon: FileText, description: "بنك أسئلة واختبارات خاصة بمدرسي المنصة" },
    ],
  },
  {
    title: "التخطيط وتنظيم الوقت",
    slug: "time_and_planning",
    columnKey: "planning",
    items: [
      { href: "/schedule", label: "جدول المحاضرات", icon: Calendar, description: "جدول الحصص المباشرة والدروس الأسبوعية" },
      { href: "/time", label: "إدارة الوقت", icon: Clock, description: "أدوات لتنظيم ساعات الاستذكار والتركيز" },
      { href: "/ai", label: "التخطيط والأهداف", icon: Target, description: "خطط دراستك ونظّم أهدافك التعليمية" },
      { href: "/tasks", label: "قائمة المهام", icon: BookMarked, description: "متابعة الواجبات والمهام الدراسية اليومية" },
      { href: "/goals", label: "تحديد الأهداف", icon: Target, description: "وضع أهداف دراسية أسبوعية وشهرية ومتابعتها" },
    ],
  },
  {
    title: "المحتوى والموارد",
    slug: "educational_content",
    columnKey: "content",
    items: [
      { href: "/library", label: "المكتبة الرقمية", icon: Library, description: "مستودع الكتب والملخصات والملفات التعليمية" },
      { href: "/resources", label: "الموارد والتحميلات", icon: FolderOpen, description: "مركز تحميل المستندات والمذكرات الدراسية" },
      { href: "/tips", label: "نصائح يومية", icon: Lightbulb, description: "نصائح وتوجيهات عملية للتفوق الدراسي" },
      { href: "/blog", label: "المدونة التعليمية", icon: FileText, description: "مقالات ومشاركات تثقيفية من المعلمين والطلاب" },
    ],
  },
  {
    title: "الأداء والتنافس",
    slug: "dashboard_and_performance",
    columnKey: "performance",
    items: [
      { href: "/analytics", label: "لوحة تحليلات الأداء", icon: BarChart3, description: "تحليلات مفصلة لمستوى دراستك ونقاط قوتك" },
      { href: "/academy", label: "الأكاديمية", icon: GraduationCap, description: "نظرة عامة على الأداء الأكاديمي العام" },
      { href: "/leaderboard", label: "لوحة الصدارة", icon: Trophy, description: "ترتيب الطلاب الأوائل والمنافسين على المنصة" },
      { href: "/contests/new", label: "تحدي جديد", icon: Gamepad2, description: "إنشاء مسابقة وتحدي دراسي جديد مع زملائك" },
      { href: "/events", label: "الأحداث والفعاليات", icon: Sparkles, description: "المشاركة في المسابقات والفعاليات الرسمية" },
    ],
  },
  {
    title: "التواصل والمجتمع",
    slug: "communication",
    columnKey: "community",
    items: [
      { href: "/chat", label: "الدردشة الجماعية", icon: Users, description: "غرف دردشة حية لمناقشة الدروس مع زملائك" },
      { href: "/forum", label: "منتدى النقاش", icon: MessageSquare, description: "طرح الأسئلة ومشاركة الإجابات مع مجتمع الطلاب" },
      { href: "/announcements", label: "إعلانات المنصة", icon: Megaphone, description: "آخر الأخبار والتحديثات الرسمية الهامة" },
    ],
  },
  {
    title: "الحساب والإعدادات والأمان",
    slug: "account_and_security",
    columnKey: "account",
    items: [
      { href: "/subscription", label: "الاشتراكات المتاحة", icon: CreditCard, description: "استعرض باقات الاشتراك وقم بالترقية" },
      { href: "/billing", label: "إدارة الفواتير", icon: CreditCard, description: "المدفوعات، الفواتير، وطرق الدفع المحفوظة" },
      { href: "/billing/referrals", label: "برنامج الإحالة", icon: UserPlus, description: "دعوة أصدقائك والحصول على مكافآت ونقاط مجانية" },
      { href: "/profile?tab=account", label: "الإعدادات العامة", icon: UserCircle2, description: "بيانات الحساب والمعلومات الشخصية" },
      { href: "/profile?tab=privacy", label: "الخصوصية والظهور", icon: Lock, description: "التحكم في خصوصية ملفك الشخصي وظهورك" },
      { href: "/profile?tab=security", label: "الأمان والوصول", icon: ShieldCheck, description: "كلمة المرور والتحقق بخطوتين وجلسات الدخول" },
      { href: "/profile?tab=activity", label: "سجل النشاط", icon: History, description: "متابعة آخر الأنشطة والعمليات على حسابك" },
      { href: "/settings/devices", label: "الأجهزة المتصلة", icon: MonitorSmartphone, description: "مراجعة الأجهزة والجلسات المتصلة بحسابك" },
      { href: "/profile?tab=notifications", label: "تفضيلات الإشعارات", icon: BellRing, description: "تخصيص إشعارات المنصة والبريد الإلكتروني" },
    ],
  },
];

export const mainNavItemsWithMegaMenu: NavItemWithMegaMenu[] = [
  { href: "/courses", label: "الدورات", icon: BookOpen, description: "استكشف الدورات التعليمية", badge: "جديد", megaMenu: coursesMegaMenu },
  { href: "/all-features", label: "المزيد", icon: Sparkles, description: "المزيد من الخيارات والأدوات", megaMenu: moreMegaMenu },
];

export const headerNavItems: NavItemWithMegaMenu[] = [
  { href: "/schools", label: "مدارس", icon: GraduationCap, description: "المراحل التعليمية من ابتدائي إلى ثانوي", megaMenu: schoolsMegaMenu },
];

/** Backend menu keys mapped to the navigation item that owns their mega menu. */
export const backendNavMenuKeys: Record<string, string> = {
  "/all-features": "all-features",
  "/schools": "schools",
};

export interface UtilityNavItem {
  href: string;
  label: string;
  position: "left" | "right";
}

/**
 * Standalone header links that are not part of the mega-menu navigation.
 * Kept data-driven here so they live next to the rest of the nav config
 * instead of being hard-coded inside Header.tsx.
 */
export const utilityNavItems: UtilityNavItem[] = [
  { href: "/teach", label: "التدريس على Tolo", position: "left" },
  { href: "/jobs", label: "وظائف Tolo", position: "left" },
  { href: "/plans", label: "الخطط", position: "right" },
];

import {
  BarChart3,
  BookMarked,
  BookOpen,
  Brain,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  Gamepad2,
  GraduationCap,
  Home,
  Library,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
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
}

export const coursesMegaMenu: MegaMenuCategory[] = [
  {
    title: "الدراسة والتعليم",
    slug: "study",
    items: [
      { href: "/courses", label: "جميع الدورات", icon: BookOpen, description: "استعرض كل الدورات التعليمية المتاحة" },
      { href: "/teachers", label: "المدرسون", icon: GraduationCap, description: "تواصل مع نخبة من أفضل المدرسين" },
    ],
  },
  {
    title: "التقييمات والامتحانات",
    slug: "exams",
    items: [
      { href: "/exams", label: "الامتحانات والتقييم", icon: ClipboardList, description: "الاختبارات الدورية وقياس المستوى المباشر" },
      { href: "/teacher-exams", label: "اختبارات المدرسين", icon: FileText, description: "بنك أسئلة واختبارات خاصة بمدرسي المنصة" },
    ],
  },
  {
    title: "تنظيم الوقت",
    slug: "time_management",
    items: [
      { href: "/schedule", label: "جدول المحاضرات", icon: Calendar, description: "جدول الحصص المباشرة والدروس الأسبوعية" },
      { href: "/time", label: "إدارة الوقت", icon: Clock, description: "أدوات لتنظيم ساعات الاستذكار والتركيز" },
    ],
  },
  {
    title: "التخطيط والأهداف",
    slug: "goals",
    items: [
      { href: "/tasks", label: "قائمة المهام", icon: BookMarked, description: "متابعة الواجبات والمهام الدراسية اليومية" },
      { href: "/goals", label: "تحديد الأهداف", icon: Target, description: "وضع أهداف دراسية أسبوعية وشهرية ومتابعتها" },
    ],
  },
];

export const libraryMegaMenu: MegaMenuCategory[] = [
  {
    title: "المحتوى التعليمي",
    slug: "digital_library",
    items: [
      { href: "/library", label: "المكتبة الرقمية", icon: Library, description: "مستودع الكتب والملخصات والملفات التعليمية" },
      { href: "/resources", label: "الموارد والتحميلات", icon: FolderOpen, description: "مركز تحميل المستندات والمذكرات الدراسية" },
    ],
  },
  {
    title: "المحتوى التثقيفي",
    slug: "awareness",
    items: [
      { href: "/tips", label: "نصائح يومية", icon: Lightbulb, description: "نصائح وتوجيهات عملية للتفوق الدراسي" },
    ],
  },
  {
    title: "لوحة التحكم والأداء",
    slug: "dashboard",
    items: [
      { href: "/analytics", label: "لوحة تحليلات الأداء", icon: BarChart3, description: "تحليلات مفصلة لمستوى دراستك ونقاط قوتك" },
      { href: "/academy", label: "الأكاديمية", icon: GraduationCap, description: "نظرة عامة على الأداء الأكاديمي العام" },
    ],
  },
];

export const competitionMegaMenu: MegaMenuCategory[] = [
  {
    title: "التنافس والترتيب",
    slug: "leaderboard",
    items: [
      { href: "/leaderboard", label: "لوحة الصدارة", icon: Trophy, description: "ترتيب الطلاب الأوائل والمنافسين على المنصة" },
      { href: "/contests/new", label: "تحدي جديد", icon: Gamepad2, description: "إنشاء مسابقة وتحدي دراسي جديد مع زملائك" },
      { href: "/events", label: "الأحداث والفعاليات", icon: Sparkles, description: "المشاركة في المسابقات والفعاليات الرسمية" },
    ],
  },
  {
    title: "التواصل والمشاركة",
    slug: "community",
    items: [
      { href: "/chat", label: "الدردشة الجماعية", icon: Users, description: "غرف دردشة حية لمناقشة الدروس مع زملائك" },
      { href: "/forum", label: "منتدى النقاش", icon: MessageSquare, description: "طرح الأسئلة ومشاركة الإجابات مع مجتمع الطلاب" },
      { href: "/blog", label: "المدونة التعليمية", icon: FileText, description: "مقالات ومشاركات تثقيفية من المعلمين والطلاب" },
      { href: "/announcements", label: "إعلانات المنصة", icon: Megaphone, description: "آخر الأخبار والتحديثات الرسمية الهامة" },
    ],
  },
];

export const schoolsMegaMenu: MegaMenuCategory[] = [
  {
    title: "المرحلة الابتدائية",
    slug: "primary",
    items: [
      { href: "/schools/primary/4", label: "الصف الرابع الابتدائي", icon: GraduationCap, description: "مناهج ومواد الصف الرابع الابتدائي" },
      { href: "/schools/primary/5", label: "الصف الخامس الابتدائي", icon: GraduationCap, description: "مناهج ومواد الصف الخامس الابتدائي" },
      { href: "/schools/primary/6", label: "الصف السادس الابتدائي", icon: GraduationCap, description: "مناهج ومواد الصف السادس الابتدائي" },
    ],
  },
  {
    title: "المرحلة الإعدادية",
    slug: "middle",
    items: [
      { href: "/schools/middle/1", label: "الصف الأول الإعدادي", icon: GraduationCap, description: "مناهج ومواد الصف الأول الإعدادي" },
      { href: "/schools/middle/2", label: "الصف الثاني الإعدادي", icon: GraduationCap, description: "مناهج ومواد الصف الثاني الإعدادي" },
      { href: "/schools/middle/3", label: "الصف الثالث الإعدادي", icon: GraduationCap, description: "مناهج ومواد الصف الثالث الإعدادي" },
    ],
  },
  {
    title: "المرحلة الثانوية",
    slug: "high_school",
    items: [
      { href: "/schools/secondary/1", label: "الصف الأول الثانوي", icon: GraduationCap, description: "مناهج ومواد الصف الأول الثانوي" },
      { href: "/schools/secondary/2", label: "الصف الثاني الثانوي", icon: GraduationCap, description: "مناهج ومواد الصف الثاني الثانوي" },
      { href: "/schools/secondary/3", label: "الصف الثالث الثانوي", icon: GraduationCap, description: "مناهج ومواد الصف الثالث الثانوي" },
    ],
  },
];

export const moreMegaMenu: MegaMenuCategory[] = [
  {
    title: "الحساب والاشتراك",
    slug: "subscription",
    items: [
      { href: "/subscription", label: "الاشتراكات المتاحة", icon: CreditCard, description: "استعرض باقات الاشتراك وقم بالترقية" },
      { href: "/billing", label: "إدارة الفواتير", icon: CreditCard, description: "المدفوعات، الفواتير، وطرق الدفع المحفوظة" },
      { href: "/billing/referrals", label: "برنامج الإحالة", icon: UserPlus, description: "دعوة أصدقائك والحصول على مكافآت ونقاط مجانية" },
    ],
  },
  {
    title: "الاتصالات",
    slug: "connections",
    items: [
      { href: "/connections/organization", label: "ربط الحساب بمنظمة", icon: Users, description: "اربط حسابك بمنظمة أو مؤسسة تعليمية" },
    ],
  },
];

export const mainNavItemsWithMegaMenu: NavItemWithMegaMenu[] = [
  { href: "/", label: "الرئيسية", icon: Home, description: "العودة إلى الصفحة الرئيسية" },
  { href: "/courses", label: "الدورات", icon: BookOpen, description: "استكشف الدورات التعليمية", badge: "جديد", megaMenu: coursesMegaMenu },
  { href: "/library", label: "المكتبة", icon: Library, description: "مصادر تعليمية متنوعة", megaMenu: libraryMegaMenu },
  { href: "/ai", label: "الذكاء الاصطناعي", icon: Brain, description: "تعلم أذكى مع AI", badge: "AI" },
  { href: "/leaderboard", label: "التحديات", icon: Gamepad2, description: "لوحة الترتيب والمنافسات", megaMenu: competitionMegaMenu },
  { href: "/all-features", label: "المزيد", icon: Sparkles, description: "المزيد من الخيارات والأدوات", megaMenu: moreMegaMenu },
];

export const headerNavItems: NavItemWithMegaMenu[] = [
  { href: "/schools", label: "مدارس", icon: GraduationCap, description: "المراحل التعليمية من ابتدائي إلى ثانوي", megaMenu: schoolsMegaMenu },
];

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
  { href: "/careers", label: "وظائف Tolo", position: "left" },
  { href: "/plans", label: "الخطط", position: "right" },
];

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
  History as HistoryIcon,
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
import type { MegaMenuCategory } from "./types";

export interface NavItemWithMegaMenu {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
  megaMenu?: MegaMenuCategory[];
}

const coursesMegaMenu: MegaMenuCategory[] = [
  {
    title: "الدراسة والتعليم",
    items: [
      { href: "/courses", label: "جميع الدورات", icon: BookOpen, description: "استعرض كل الدورات التعليمية المتاحة" },
      { href: "/my-courses", label: "دوراتي", icon: BookMarked, description: "الدورات والمسارات التي تتابعها حالياً" },
      { href: "/teachers", label: "المدرسون", icon: GraduationCap, description: "تواصل مع نخبة من أفضل المدرسين" },
    ],
  },
  {
    title: "التقييمات والامتحانات",
    items: [
      { href: "/exams", label: "الامتحانات والتقييم", icon: ClipboardList, description: "الاختبارات الدورية وقياس المستوى المباشر" },
      { href: "/teacher-exams", label: "اختبارات المدرسين", icon: FileText, description: "بنك أسئلة واختبارات خاصة بمدرسي المنصة" },
    ],
  },
  {
    title: "النتائج والتقدير",
    items: [
      { href: "/progress", label: "مستوى التقدم", icon: TrendingUp, description: "متابعة نسبة إنجازك للمناهج التعليمية" },
      { href: "/achievements", label: "الإنجازات والأوسمة", icon: Award, description: "الأوسمة والنقاط التي حصدتها خلال تعلمك" },
      { href: "/certificates", label: "الشهادات", icon: Trophy, description: "عرض وتحميل شهادات إتمام الدورات" },
    ],
  },
];

const scheduleMegaMenu: MegaMenuCategory[] = [
  {
    title: "تنظيم الوقت",
    items: [
      { href: "/schedule", label: "جدول المحاضرات", icon: Calendar, description: "جدول الحصص المباشرة والدروس الأسبوعية" },
      { href: "/time", label: "إدارة الوقت", icon: Clock, description: "أدوات لتنظيم ساعات الاستذكار والتركيز" },
    ],
  },
  {
    title: "التخطيط والأهداف",
    items: [
      { href: "/tasks", label: "قائمة المهام", icon: BookMarked, description: "متابعة الواجبات والمهام الدراسية اليومية" },
      { href: "/goals", label: "تحديد الأهداف", icon: Target, description: "وضع أهداف دراسية أسبوعية وشهرية ومتابعتها" },
    ],
  },
];

const libraryMegaMenu: MegaMenuCategory[] = [
  {
    title: "المحتوى التعليمي",
    items: [
      { href: "/library", label: "المكتبة الرقمية", icon: Library, description: "مستودع الكتب والملخصات والملفات التعليمية" },
      { href: "/resources", label: "الموارد والتحميلات", icon: FolderOpen, description: "مركز تحميل المستندات والمذكرات الدراسية" },
    ],
  },
  {
    title: "المحتوى التثقيفي",
    items: [
      { href: "/tips", label: "نصائح يومية", icon: Lightbulb, description: "نصائح وتوجيهات عملية للتفوق الدراسي" },
    ],
  },
];

const analyticsMegaMenu: MegaMenuCategory[] = [
  {
    title: "لوحة التحكم والأداء",
    items: [
      { href: "/analytics", label: "لوحة تحليلات الأداء", icon: BarChart3, description: "تحليلات مفصلة لمستوى دراستك ونقاط قوتك" },
      { href: "/academy", label: "الأكاديمية", icon: GraduationCap, description: "نظرة عامة على الأداء الأكاديمي العام" },
    ],
  },
];

const competitionMegaMenu: MegaMenuCategory[] = [
  {
    title: "التنافس والترتيب",
    items: [
      { href: "/leaderboard", label: "لوحة الصدارة", icon: Trophy, description: "ترتيب الطلاب الأوائل والمنافسين على المنصة" },
      { href: "/contests/new", label: "تحدي جديد", icon: Gamepad2, description: "إنشاء مسابقة وتحدي دراسي جديد مع زملائك" },
      { href: "/events", label: "الأحداث والفعاليات", icon: Sparkles, description: "المشاركة في المسابقات والفعاليات الرسمية" },
    ],
  },
  {
    title: "التواصل والمشاركة",
    items: [
      { href: "/chat", label: "الدردشة الجماعية", icon: Users, description: "غرف دردشة حية لمناقشة الدروس مع زملائك" },
      { href: "/forum", label: "منتدى النقاش", icon: MessageSquare, description: "طرح الأسئلة ومشاركة الإجابات مع مجتمع الطلاب" },
      { href: "/blog", label: "المدونة التعليمية", icon: FileText, description: "مقالات ومشاركات تثقيفية من المعلمين والطلاب" },
      { href: "/announcements", label: "إعلانات المنصة", icon: Megaphone, description: "آخر الأخبار والتحديثات الرسمية الهامة" },
    ],
  },
];

export const moreMegaMenu: MegaMenuCategory[] = [
  {
    title: "الحساب والاشتراك",
    items: [
      { href: "/subscription", label: "الاشتراكات المتاحة", icon: CreditCard, description: "استعرض باقات الاشتراك وقم بالترقية" },
      { href: "/billing", label: "إدارة الفواتير", icon: CreditCard, description: "المدفوعات، الفواتير، وطرق الدفع المحفوظة" },
      { href: "/billing/referrals", label: "برنامج الإحالة", icon: UserPlus, description: "دعوة أصدقائك والحصول على مكافآت ونقاط مجانية" },
    ],
  },
  {
    title: "الإعدادات والأمان",
    items: [
      { href: "/settings", label: "الإعدادات العامة", icon: Settings, description: "تخصيص الملف الشخصي والمظهر والتفضيلات" },
      { href: "/settings/privacy", label: "الخصوصية والظهور", icon: Shield, description: "التحكم في بياناتك وظهورك لزملائك" },
      { href: "/settings/security", label: "الأمان والوصول", icon: Shield, description: "تغيير كلمة المرور وتفعيل حماية الحساب" },
      { href: "/settings/security/logs", label: "سجل النشاط", icon: HistoryIcon, description: "عرض تفاصيل وسجلات الدخول لحسابك" },
      { href: "/settings/devices", label: "الأجهزة المتصلة", icon: Activity, description: "إدارة الأجهزة النشطة التي تستخدم حسابك" },
      { href: "/settings/notifications", label: "تفضيلات الإشعارات", icon: Bell, description: "تحديد كيفية ووقت تلقي التنبيهات" },
    ],
  },
];

export const mainNavItemsWithMegaMenu: NavItemWithMegaMenu[] = [
  { href: "/", label: "الرئيسية", icon: Home, description: "العودة إلى الصفحة الرئيسية" },
  { href: "/courses", label: "الدورات", icon: BookOpen, description: "استكشف الدورات التعليمية", badge: "جديد", megaMenu: coursesMegaMenu },
  { href: "/schedule", label: "الجدول", icon: Calendar, description: "متابعة المواعيد والمهام", megaMenu: scheduleMegaMenu },
  { href: "/library", label: "المكتبة", icon: Library, description: "مصادر تعليمية متنوعة", megaMenu: libraryMegaMenu },
  { href: "/analytics", label: "التحليلات", icon: BarChart3, description: "متابعة دقيقة لمستواك", megaMenu: analyticsMegaMenu },
  { href: "/leaderboard", label: "التحديات", icon: Gamepad2, description: "لوحة الترتيب والمنافسات", megaMenu: competitionMegaMenu },
  { href: "/ai", label: "الذكاء الاصطناعي", icon: Brain, description: "تعلم أذكى مع AI", badge: "AI" },
  { href: "/settings", label: "المزيد", icon: Sparkles, description: "المزيد من الخيارات والأدوات", megaMenu: moreMegaMenu },
];

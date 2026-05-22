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
    title: "التصنيفات",
    items: [
      { href: "/courses", label: "جميع الدورات", icon: BookOpen, description: "استعرض كل الدورات المتاحة" },
      { href: "/progress", label: "تقدمي الدراسي", icon: CheckCircle, description: "تابع مستوى تقدمك في الدورات" },
      { href: "/resources", label: "المصادر التعليمية", icon: Star, description: "اعثر على المواد الدراسية" },
    ],
  },
  {
    title: "المكتبة",
    items: [
      { href: "/library", label: "المواد التعليمية", icon: FileText, description: "الملفات والمراجع الدراسية" },
      { href: "/resources", label: "التحميلات", icon: Download, description: "حمّل الملفات التعليمية بأمان" },
    ],
  },
  {
    title: "النتائج",
    items: [
      { href: "/progress", label: "تحليل الأداء", icon: TrendingUp, description: "تقارير مختصرة عن أدائك" },
      { href: "/achievements", label: "الإنجازات", icon: Award, description: "الجوائز والأوسمة التي حصلت عليها" },
    ],
  },
];

const scheduleMegaMenu: MegaMenuCategory[] = [
  {
    title: "المواعيد",
    items: [{ href: "/schedule", label: "جدول المحاضرات", icon: Calendar, description: "مواعيد المحاضرات والدروس" }],
  },
  {
    title: "الفعاليات",
    items: [
      { href: "/events", label: "الأحداث", icon: Sparkles, description: "فعاليات وأحداث قادمة" },
      { href: "/exams", label: "الامتحانات", icon: ClipboardList, description: "جدول الاختبارات والنتائج" },
      { href: "/notifications", label: "التنبيهات", icon: Bell, description: "ابقِ على اطلاع بكل جديد" },
    ],
  },
];

const timeManagementMegaMenu: MegaMenuCategory[] = [
  {
    title: "التوقيت",
    items: [
      { href: "/time", label: "تنظيم الوقت", icon: Clock, description: "أدوات لإدارة وقتك بفاعلية" },
      { href: "/time", label: "سجل النشاط", icon: Activity, description: "متابعة نشاطك اليومي" },
    ],
  },
  {
    title: "المهام",
    items: [
      { href: "/tasks", label: "قائمة المهام", icon: BookMarked, description: "المهام والواجبات اليومية" },
      { href: "/notifications", label: "الإشعارات الهامة", icon: Bell, description: "تنبيهات المواعيد والمهام" },
      { href: "/time", label: "المؤقت الدراسي", icon: Clock, description: "أداة تركيز ومتابعة ذكية" },
    ],
  },
];

const libraryMegaMenu: MegaMenuCategory[] = [
  {
    title: "المصادر",
    items: [
      { href: "/library", label: "بنك الأسئلة", icon: FileText, description: "أسئلة وتدريبات شاملة" },
      { href: "/resources", label: "مركز التحميل", icon: Download, description: "ملخصات ومذكرات" },
    ],
  },
  {
    title: "المساهمة",
    items: [{ href: "/resources", label: "رفع ملف", icon: Upload, description: "شارك ملفاتك مع الآخرين" }],
  },
];

const analyticsMegaMenu: MegaMenuCategory[] = [
  {
    title: "تحليلات عامة",
    items: [
      { href: "/analytics", label: "لوحة البيانات", icon: BarChart3, description: "نظرة شاملة على تقدمك" },
      { href: "/progress", label: "الرسم البياني للتطور", icon: TrendingUp, description: "تمثيل بصري لمسارك الدراسي" },
      { href: "/analytics", label: "معدل الحضور", icon: Activity, description: "إحصاءات التواجد والنشاط" },
    ],
  },
  {
    title: "التقارير",
    items: [
      { href: "/analytics", label: "نتائج الاختبارات", icon: FileText, description: "تحليل مفصل لدرجاتك" },
      { href: "/analytics", label: "تصدير التقارير", icon: Download, description: "صدّر بياناتك بصيغة PDF" },
    ],
  },
];

const competitionMegaMenu: MegaMenuCategory[] = [
  {
    title: "التحديات والترتيب",
    items: [
      { href: "/leaderboard", label: "لوحة الترتيب", icon: Trophy, description: "اعرف ترتيبك بين زملائك" },
      { href: "/achievements", label: "الإنجازات", icon: Award, description: "كل ما حققته في رحلتك" },
      { href: "/contests/new", label: "إنشاء تحدي جديد", icon: Gamepad2, description: "ابدأ منافسة جديدة مع زملائك" },
    ],
  },
  {
    title: "مجتمع المنافسة",
    items: [
      { href: "/events", label: "الأحداث والمسابقات", icon: Sparkles, description: "فعاليات ومسابقات متاحة" },
      { href: "/forum", label: "نقاشات الطلاب", icon: MessageSquare, description: "شارك أفكارك واستفساراتك" },
      { href: "/chat", label: "الدردشة", icon: Users, description: "تواصل مباشر مع زملائك" },
    ],
  },
];

export const moreMegaMenu: MegaMenuCategory[] = [
  {
    title: "الدراسة والتعليم",
    items: [
      { href: "/academy", label: "الأكاديمية", icon: GraduationCap, description: "مساحة التعلم الرئيسية" },
      { href: "/my-courses", label: "كورساتي", icon: BookMarked, description: "الدورات التي تتابعها" },
      { href: "/exams", label: "الامتحانات", icon: ClipboardList, description: "الاختبارات الدورية والشهرية" },
      { href: "/teacher-exams", label: "اختبارات المدرسين", icon: ClipboardList, description: "بنك أسئلة المدرسين" },
      { href: "/progress", label: "التقدم الدراسي", icon: TrendingUp, description: "تابع تحسنك أولًا بأول" },
      { href: "/teachers", label: "المدرسون", icon: GraduationCap, description: "تواصل مع أفضل المدرسين" },
      { href: "/resources", label: "الموارد", icon: FolderOpen, description: "موارد تعليمية إضافية" },
    ],
  },
  {
    title: "التفاعل والمناقشة",
    items: [
      { href: "/forum", label: "المنتدى", icon: MessageSquare, description: "ناقش الدروس مع زملائك" },
      { href: "/chat", label: "الدردشة", icon: Users, description: "تواصل مباشر مع الطلاب" },
      { href: "/blog", label: "المدونة", icon: FileText, description: "مقالات ونصائح دراسية" },
      { href: "/announcements", label: "الإعلانات", icon: Megaphone, description: "أحدث أخبار المنصة" },
      { href: "/events", label: "المسابقات", icon: Sparkles, description: "سجّل في المسابقات المتاحة" },
      { href: "/events/new", label: "إضافة فعالية", icon: Upload, description: "أنشئ فعالية أو مسابقة جديدة" },
    ],
  },
  {
    title: "الإنجازات والمنافسة",
    items: [
      { href: "/achievements", label: "الإنجازات", icon: Trophy, description: "كل ما حققته في رحلتك" },
      { href: "/contests/new", label: "بطولات جديدة", icon: Gamepad2, description: "نافس واربح جوائز قيمة" },
      { href: "/leaderboard", label: "لوحة الترتيب", icon: Award, description: "ترتيبك بين زملائك" },
    ],
  },
  {
    title: "الذكاء الاصطناعي",
    items: [
      { href: "/ai", label: "المساعد الذكي", icon: Brain, description: "دعم دراسي مدعوم بالذكاء الاصطناعي", badge: "AI" },
      { href: "/goals", label: "تحديد الأهداف", icon: Target, description: "خطط لمستقبلك بذكاء" },
      { href: "/tasks", label: "إدارة المهام الذكية", icon: BookMarked, description: "ترتيب المهام حسب الأولوية" },
      { href: "/tips", label: "نصائح يومية", icon: Lightbulb, description: "جرعة تحفيزية ومعلومات مفيدة" },
    ],
  },
  {
    title: "الحساب والأمان",
    items: [
      { href: "/subscription", label: "الاشتراكات والفواتير", icon: CreditCard, description: "إدارة اشتراكك وعرض الفواتير" },
      { href: "/billing", label: "الفواتير", icon: CreditCard, description: "تابع المدفوعات وخطط الاشتراك" },
      { href: "/billing/referrals", label: "الإحالات", icon: UserPlus, description: "شارك رابطك وتابع الدعوات" },
      { href: "/settings", label: "الإعدادات العامة", icon: Settings, description: "خصص تجربتك في المنصة" },
      { href: "/settings/privacy", label: "الخصوصية", icon: Shield, description: "تحكم في بياناتك وظهورك" },
      { href: "/settings/devices", label: "الأجهزة", icon: Activity, description: "إدارة الأجهزة المتصلة بحسابك" },
      { href: "/settings/notifications", label: "إعدادات الإشعارات", icon: Bell, description: "خصص تنبيهات المنصة" },
      { href: "/notifications", label: "الإشعارات", icon: Bell, description: "تحكم في طريقة تلقيك للإشعارات" },
      { href: "/settings/security", label: "الأمان", icon: Shield, description: "حماية الحساب وكلمة المرور" },
      { href: "/settings/security/logs", label: "سجل الدخول", icon: HistoryIcon, description: "مراجعة نشاط تسجيل الدخول" },
    ],
  },
];

export const mainNavItemsWithMegaMenu: NavItemWithMegaMenu[] = [
  { href: "/", label: "الرئيسية", icon: Home, description: "العودة إلى الصفحة الرئيسية" },
  { href: "/courses", label: "الدورات", icon: BookOpen, description: "استكشف الدورات التعليمية", badge: "جديد", megaMenu: coursesMegaMenu },
  { href: "/schedule", label: "الجدول", icon: Calendar, description: "متابعة المواعيد والمهام", megaMenu: scheduleMegaMenu },
  { href: "/time", label: "إدارة الوقت", icon: Clock, description: "تنظيم وقتك بذكاء", megaMenu: timeManagementMegaMenu },
  { href: "/library", label: "المكتبة", icon: Library, description: "مصادر تعليمية متنوعة", megaMenu: libraryMegaMenu },
  { href: "/analytics", label: "التحليلات", icon: BarChart3, description: "متابعة دقيقة لمستواك", megaMenu: analyticsMegaMenu },
  { href: "/leaderboard", label: "التحديات", icon: Gamepad2, description: "لوحة الترتيب والمنافسات", megaMenu: competitionMegaMenu },
  { href: "/ai", label: "الذكاء الاصطناعي", icon: Brain, description: "تعلم أذكى مع AI", badge: "AI", megaMenu: moreMegaMenu },
  { href: "/more", label: "المزيد", icon: Sparkles, description: "المزيد من الخيارات والأدوات", megaMenu: moreMegaMenu },
];

import {
	Home,
	BookOpen,
	Calendar,
	Clock,
	Library,
	BarChart3,
	ClipboardList,
	TrendingUp,
	GraduationCap,
	FolderOpen,
	MessageSquare,
	Users,
	FileText,
	Megaphone,
	Sparkles,
	Trophy,
	Award,
	Brain,
	Target,
	BookMarked,
	Lightbulb,
	User,
	Settings,
	Bell,
	Shield,
	Activity,
	PlayCircle,
	Video,
	Book,
	FileText as FileTextIcon,
	Download,
	Upload,
	Star,
	CheckCircle,
	XCircle,
	AlertCircle,
} from "lucide-react";
import { MegaMenuCategory } from "./types";
import type { LucideIcon } from "lucide-react";

export interface NavItemWithMegaMenu {
	href: string;
	label: string;
	icon: LucideIcon;
	badge?: string;
	description?: string;
	megaMenu?: MegaMenuCategory[];
}

// الدورات - Courses Mega Menu
export const coursesMegaMenu: MegaMenuCategory[] = [
	{
		title: "الدورات التعليمية",
		items: [
			{
				href: "/courses",
				label: "جميع الدورات",
				icon: BookOpen,
				description: "استعرض جميع الدورات المتاحة",
			},
			{
				href: "/courses/my-courses",
				label: "دوراتي",
				icon: Book,
				description: "الدورات المسجلة فيها",
			},
			{
				href: "/courses/enrolled",
				label: "الدورات المسجلة",
				icon: CheckCircle,
				description: "الدورات التي سجلت فيها",
			},
			{
				href: "/courses/favorites",
				label: "المفضلة",
				icon: Star,
				description: "الدورات المفضلة لديك",
			},
		],
	},
	{
		title: "محتوى الدورات",
		items: [
			{
				href: "/courses/videos",
				label: "الفيديوهات",
				icon: Video,
				description: "مقاطع الفيديو التعليمية",
			},
			{
				href: "/courses/lessons",
				label: "الدروس",
				icon: PlayCircle,
				description: "الدروس التفاعلية",
			},
			{
				href: "/courses/materials",
				label: "المواد التعليمية",
				icon: FileTextIcon,
				description: "الملفات والمواد الدراسية",
			},
			{
				href: "/courses/downloads",
				label: "التحميلات",
				icon: Download,
				description: "تحميل المواد",
			},
		],
	},
	{
		title: "التقدم في الدورات",
		items: [
			{
				href: "/courses/progress",
				label: "تقدمي في الدورات",
				icon: TrendingUp,
				description: "تتبع تقدمك في الدورات",
			},
			{
				href: "/courses/certificates",
				label: "الشهادات",
				icon: Award,
				description: "شهادات إتمام الدورات",
			},
		],
	},
];

// الجدول الدراسي - Schedule Mega Menu
export const scheduleMegaMenu: MegaMenuCategory[] = [
	{
		title: "الجدول الدراسي",
		items: [
			{
				href: "/schedule",
				label: "الجدول اليومي",
				icon: Calendar,
				description: "جدولك الدراسي اليوم",
			},
			{
				href: "/schedule/weekly",
				label: "الجدول الأسبوعي",
				icon: Calendar,
				description: "جدولك الأسبوعي",
			},
			{
				href: "/schedule/monthly",
				label: "الجدول الشهري",
				icon: Calendar,
				description: "جدولك الشهري",
			},
		],
	},
	{
		title: "الفعاليات والمناسبات",
		items: [
			{
				href: "/schedule/events",
				label: "الفعاليات",
				icon: Sparkles,
				description: "الفعاليات القادمة",
			},
			{
				href: "/schedule/exams",
				label: "الامتحانات",
				icon: ClipboardList,
				description: "جدول الامتحانات",
			},
			{
				href: "/schedule/reminders",
				label: "التذكيرات",
				icon: Bell,
				description: "تذكيراتك المهمة",
			},
		],
	},
];

// إدارة الوقت - Time Management Mega Menu
export const timeManagementMegaMenu: MegaMenuCategory[] = [
	{
		title: "إدارة الوقت",
		items: [
			{
				href: "/time",
				label: "لوحة التحكم",
				icon: Clock,
				description: "نظرة عامة على وقتك",
			},
			{
				href: "/time/tracker",
				label: "تتبع الوقت",
				icon: Activity,
				description: "تتبع وقتك الدراسي",
			},
			{
				href: "/time/schedule",
				label: "الجدول الأسبوعي",
				icon: Calendar,
				description: "جدولك الأسبوعي",
			},
		],
	},
	{
		title: "المهام والتذكيرات",
		items: [
			{
				href: "/time/tasks",
				label: "المهام",
				icon: BookMarked,
				description: "مهامك اليومية",
			},
			{
				href: "/time/reminders",
				label: "التذكيرات",
				icon: Bell,
				description: "تذكيراتك المهمة",
			},
			{
				href: "/time/history",
				label: "سجل الجلسات",
				icon: Clock,
				description: "سجل جلساتك الدراسية",
			},
		],
	},
];

// المكتبة - Library Mega Menu
export const libraryMegaMenu: MegaMenuCategory[] = [
	{
		title: "المكتبة الرقمية",
		items: [
			{
				href: "/library",
				label: "جميع الكتب",
				icon: Book,
				description: "استعرض جميع الكتب",
			},
			{
				href: "/library/books",
				label: "الكتب",
				icon: BookOpen,
				description: "الكتب التعليمية",
			},
			{
				href: "/library/documents",
				label: "الوثائق",
				icon: FileText,
				description: "الوثائق والملفات",
			},
			{
				href: "/library/downloads",
				label: "التحميلات",
				icon: Download,
				description: "الملفات المحملة",
			},
		],
	},
	{
		title: "التصنيفات",
		items: [
			{
				href: "/library/favorites",
				label: "المفضلة",
				icon: Star,
				description: "كتبك المفضلة",
			},
			{
				href: "/library/recent",
				label: "المؤخر",
				icon: Clock,
				description: "الكتب المفتوحة مؤخراً",
			},
			{
				href: "/library/upload",
				label: "رفع ملف",
				icon: Upload,
				description: "رفع ملف جديد",
			},
		],
	},
];

// التحليلات - Analytics Mega Menu
export const analyticsMegaMenu: MegaMenuCategory[] = [
	{
		title: "التحليلات والإحصائيات",
		items: [
			{
				href: "/analytics",
				label: "نظرة عامة",
				icon: BarChart3,
				description: "إحصائياتك العامة",
			},
			{
				href: "/analytics/progress",
				label: "التقدم الدراسي",
				icon: TrendingUp,
				description: "تتبع تقدمك الدراسي",
			},
			{
				href: "/analytics/performance",
				label: "الأداء",
				icon: Activity,
				description: "تحليل أدائك",
			},
		],
	},
	{
		title: "التقارير",
		items: [
			{
				href: "/analytics/reports",
				label: "التقارير",
				icon: FileText,
				description: "التقارير التفصيلية",
			},
			{
				href: "/analytics/exports",
				label: "تصدير البيانات",
				icon: Download,
				description: "تصدير بياناتك",
			},
		],
	},
];

// المزيد - More Mega Menu (الكل في واحد)
export const moreMegaMenu: MegaMenuCategory[] = [
	{
		title: "التعليم والدراسة",
		items: [
			{
				href: "/exams",
				label: "الامتحانات",
				icon: ClipboardList,
				description: "الامتحانات والاختبارات",
			},
			{
				href: "/teacher-exams",
				label: "امتحانات المعلمين",
				icon: ClipboardList,
				description: "امتحانات المعلمين",
			},
			{
				href: "/progress",
				label: "التقدم الدراسي",
				icon: TrendingUp,
				description: "تتبع تقدمك الدراسي",
			},
			{
				href: "/teachers",
				label: "المعلمين",
				icon: GraduationCap,
				description: "قائمة المعلمين",
			},
			{
				href: "/resources",
				label: "الموارد",
				icon: FolderOpen,
				description: "الموارد التعليمية",
			},
		],
	},
	{
		title: "التفاعل والمناقشة",
		items: [
			{
				href: "/forum",
				label: "المنتدى",
				icon: MessageSquare,
				description: "المنتدى التعليمي",
			},
			{
				href: "/chat",
				label: "الدردشة",
				icon: Users,
				description: "الدردشة مع المستخدمين",
			},
			{
				href: "/blog",
				label: "المدونة",
				icon: FileText,
				description: "المدونة التعليمية",
			},
			{
				href: "/announcements",
				label: "الإعلانات",
				icon: Megaphone,
				description: "الإعلانات والمسابقات",
			},
			{
				href: "/events",
				label: "المناسبات",
				icon: Sparkles,
				description: "الفعاليات والمناسبات",
			},
		],
	},
	{
		title: "الإنجازات والمسابقات",
		items: [
			{
				href: "/achievements",
				label: "الإنجازات",
				icon: Trophy,
				description: "إنجازاتك وميدالياتك",
			},
			{
				href: "/contests",
				label: "المسابقات",
				icon: Trophy,
				description: "المسابقات التعليمية",
			},
			{
				href: "/leaderboard",
				label: "لوحة المتصدرين",
				icon: Award,
				description: "ترتيب الطلاب",
			},
		],
	},
	{
		title: "الأدوات والمساعدة",
		items: [
			{
				href: "/ai",
				label: "المساعد الذكي",
				icon: Brain,
				description: "مساعد ذكي للتعلم",
				badge: "AI",
			},
			{
				href: "/goals",
				label: "الأهداف",
				icon: Target,
				description: "أهدافك الدراسية",
			},
			{
				href: "/tasks",
				label: "المهام",
				icon: BookMarked,
				description: "مهامك اليومية",
			},
			{
				href: "/tips",
				label: "النصائح",
				icon: Lightbulb,
				description: "نصائح دراسية مفيدة",
			},
		],
	},
	{
		title: "الحساب والأمان",
		items: [
			{
				href: "/profile",
				label: "الملف الشخصي",
				icon: User,
				description: "ملفك الشخصي",
			},
			{
				href: "/settings",
				label: "الإعدادات",
				icon: Settings,
				description: "إعدادات الحساب والمنصة",
			},
			{
				href: "/notifications",
				label: "الإشعارات",
				icon: Bell,
				description: "إشعاراتك الخاصة",
			},
			{
				href: "/security",
				label: "الأمان",
				icon: Shield,
				description: "إعدادات الأمان والحماية",
			},
			{
				href: "/security/activity",
				label: "سجل النشاط",
				icon: Activity,
				description: "سجل نشاطات الحساب",
			},
		],
	},
];

// AI-Powered Suggestions Mega Menu
export const aiSuggestionsMegaMenu: MegaMenuCategory[] = [
  {
    title: "توصيات ذكية",
    items: [
      {
        href: "/ai",
        label: "المساعد الذكي",
        icon: Brain,
        description: "مساعد ذكي للتعلم والدراسة",
        badge: "AI",
      },
      {
        href: "/ai/recommendations",
        label: "التوصيات الشخصية",
        icon: Sparkles,
        description: "محتوى مخصص بناءً على نشاطك",
        badge: "جديد",
      },
      {
        href: "/ai/learning-path",
        label: "مسار التعلم",
        icon: Target,
        description: "خطة دراسية مخصصة",
      },
    ],
  },
  {
    title: "أدوات الذكاء الاصطناعي",
    items: [
      {
        href: "/ai/content-generator",
        label: "إنشاء المحتوى",
        icon: Lightbulb,
        description: "أنشئ محتوى تعليمي بمساعدة الذكاء الاصطناعي",
      },
      {
        href: "/ai/summarizer",
        label: "تلخيص النصوص",
        icon: FileText,
        description: "تلخيص المقالات والكتب",
      },
      {
        href: "/ai/quiz-generator",
        label: "إنشاء الاختبارات",
        icon: CheckCircle,
        description: "أنشئ اختبارات تفاعلية",
      },
      {
        href: "/ai/progress-analysis",
        label: "تحليل التقدم",
        icon: BarChart3,
        description: "تحليل شامل لتقدمك الدراسي",
      },
    ],
  },
];

export const mainNavItemsWithMegaMenu: NavItemWithMegaMenu[] = [
  {
    href: "/",
    label: "الرئيسية",
    icon: Home,
    description: "الصفحة الرئيسية",
  },
  {
    href: "/courses",
    label: "الدورات",
    icon: BookOpen,
    description: "الدورات التعليمية",
    badge: "جديد",
    megaMenu: coursesMegaMenu,
  },
  {
    href: "/schedule",
    label: "الجدول الدراسي",
    icon: Calendar,
    description: "جدولك الدراسي",
    megaMenu: scheduleMegaMenu,
  },
  {
    href: "/time",
    label: "إدارة الوقت",
    icon: Clock,
    description: "تنظيم الوقت",
    megaMenu: timeManagementMegaMenu,
  },
  {
    href: "/library",
    label: "المكتبة",
    icon: Library,
    description: "المكتبة الرقمية",
    megaMenu: libraryMegaMenu,
  },
  {
    href: "/analytics",
    label: "التحليلات",
    icon: BarChart3,
    description: "إحصائيات التقدم",
    megaMenu: analyticsMegaMenu,
  },
  {
    href: "/ai",
    label: "الذكاء الاصطناعي",
    icon: Brain,
    description: "أدوات الذكاء الاصطناعي",
    badge: "AI",
    megaMenu: aiSuggestionsMegaMenu,
  },
];


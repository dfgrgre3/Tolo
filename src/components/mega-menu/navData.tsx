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
	FileText as FileTextIcon,
	History as HistoryIcon,
	Download,
	Upload,
	Star,
	CheckCircle,
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
				href: "/progress",
				label: "الدورات المسجلة",
				icon: CheckCircle,
				description: "الدورات التي سجلت فيها",
			},
			{
				href: "/resources",
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
				href: "/library",
				label: "المواد التعليمية",
				icon: FileTextIcon,
				description: "الملفات والمواد الدراسية",
			},
			{
				href: "/resources",
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
				href: "/progress",
				label: "تقدمي في الدورات",
				icon: TrendingUp,
				description: "تتبع تقدمك في الدورات",
			},
			{
				href: "/achievements",
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
		],
	},
	{
		title: "الفعاليات والمناسبات",
		items: [
			{
				href: "/events",
				label: "الفعاليات",
				icon: Sparkles,
				description: "الفعاليات القادمة",
			},
			{
				href: "/exams",
				label: "الامتحانات",
				icon: ClipboardList,
				description: "جدول الامتحانات",
			},
			{
				href: "/notifications",
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
				href: "/time",
				label: "تتبع الوقت",
				icon: Activity,
				description: "تتبع وقتك الدراسي",
			},
		],
	},
	{
		title: "المهام والتذكيرات",
		items: [
			{
				href: "/tasks",
				label: "المهام",
				icon: BookMarked,
				description: "مهامك اليومية",
			},
			{
				href: "/notifications",
				label: "التذكيرات",
				icon: Bell,
				description: "تذكيراتك المهمة",
			},
			{
				href: "/time",
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
				label: "الوثائق",
				icon: FileText,
				description: "الوثائق والملفات",
			},
			{
				href: "/resources",
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
				href: "/resources",
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
				href: "/progress",
				label: "التقدم الدراسي",
				icon: TrendingUp,
				description: "تتبع تقدمك الدراسي",
			},
			{
				href: "/analytics",
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
				href: "/analytics",
				label: "التقارير",
				icon: FileText,
				description: "التقارير التفصيلية",
			},
			{
				href: "/analytics",
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
				href: "/contests/new",
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
				href: "/settings/security",
				label: "الأمان",
				icon: Shield,
				description: "إعدادات الأمان والحماية",
			},
			{
				href: "/settings/security/logs",
				label: "سجل الأمان",
				icon: HistoryIcon,
				description: "سجل نشاطات الأمان والحماية",
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
        href: "/ai",
        label: "التوصيات الشخصية",
        icon: Sparkles,
        description: "محتوى مخصص بناءً على نشاطك",
        badge: "جديد",
      },
      {
        href: "/tips",
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
        href: "/analytics",
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


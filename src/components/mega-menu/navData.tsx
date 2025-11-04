import React from "react";
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

export interface NavItemWithMegaMenu {
	href: string;
	label: string;
	icon: React.ReactNode;
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
				icon: <BookOpen className="h-4 w-4" />,
				description: "استعرض جميع الدورات المتاحة",
			},
			{
				href: "/courses/my-courses",
				label: "دوراتي",
				icon: <Book className="h-4 w-4" />,
				description: "الدورات المسجلة فيها",
			},
			{
				href: "/courses/enrolled",
				label: "الدورات المسجلة",
				icon: <CheckCircle className="h-4 w-4" />,
				description: "الدورات التي سجلت فيها",
			},
			{
				href: "/courses/favorites",
				label: "المفضلة",
				icon: <Star className="h-4 w-4" />,
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
				icon: <Video className="h-4 w-4" />,
				description: "مقاطع الفيديو التعليمية",
			},
			{
				href: "/courses/lessons",
				label: "الدروس",
				icon: <PlayCircle className="h-4 w-4" />,
				description: "الدروس التفاعلية",
			},
			{
				href: "/courses/materials",
				label: "المواد التعليمية",
				icon: <FileTextIcon className="h-4 w-4" />,
				description: "الملفات والمواد الدراسية",
			},
			{
				href: "/courses/downloads",
				label: "التحميلات",
				icon: <Download className="h-4 w-4" />,
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
				icon: <TrendingUp className="h-4 w-4" />,
				description: "تتبع تقدمك في الدورات",
			},
			{
				href: "/courses/certificates",
				label: "الشهادات",
				icon: <Award className="h-4 w-4" />,
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
				icon: <Calendar className="h-4 w-4" />,
				description: "جدولك الدراسي اليوم",
			},
			{
				href: "/schedule/weekly",
				label: "الجدول الأسبوعي",
				icon: <Calendar className="h-4 w-4" />,
				description: "جدولك الأسبوعي",
			},
			{
				href: "/schedule/monthly",
				label: "الجدول الشهري",
				icon: <Calendar className="h-4 w-4" />,
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
				icon: <Sparkles className="h-4 w-4" />,
				description: "الفعاليات القادمة",
			},
			{
				href: "/schedule/exams",
				label: "الامتحانات",
				icon: <ClipboardList className="h-4 w-4" />,
				description: "جدول الامتحانات",
			},
			{
				href: "/schedule/reminders",
				label: "التذكيرات",
				icon: <Bell className="h-4 w-4" />,
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
				icon: <Clock className="h-4 w-4" />,
				description: "نظرة عامة على وقتك",
			},
			{
				href: "/time/tracker",
				label: "تتبع الوقت",
				icon: <Activity className="h-4 w-4" />,
				description: "تتبع وقتك الدراسي",
			},
			{
				href: "/time/schedule",
				label: "الجدول الأسبوعي",
				icon: <Calendar className="h-4 w-4" />,
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
				icon: <BookMarked className="h-4 w-4" />,
				description: "مهامك اليومية",
			},
			{
				href: "/time/reminders",
				label: "التذكيرات",
				icon: <Bell className="h-4 w-4" />,
				description: "تذكيراتك المهمة",
			},
			{
				href: "/time/history",
				label: "سجل الجلسات",
				icon: <Clock className="h-4 w-4" />,
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
				icon: <Book className="h-4 w-4" />,
				description: "استعرض جميع الكتب",
			},
			{
				href: "/library/books",
				label: "الكتب",
				icon: <BookOpen className="h-4 w-4" />,
				description: "الكتب التعليمية",
			},
			{
				href: "/library/documents",
				label: "الوثائق",
				icon: <FileText className="h-4 w-4" />,
				description: "الوثائق والملفات",
			},
			{
				href: "/library/downloads",
				label: "التحميلات",
				icon: <Download className="h-4 w-4" />,
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
				icon: <Star className="h-4 w-4" />,
				description: "كتبك المفضلة",
			},
			{
				href: "/library/recent",
				label: "المؤخر",
				icon: <Clock className="h-4 w-4" />,
				description: "الكتب المفتوحة مؤخراً",
			},
			{
				href: "/library/upload",
				label: "رفع ملف",
				icon: <Upload className="h-4 w-4" />,
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
				icon: <BarChart3 className="h-4 w-4" />,
				description: "إحصائياتك العامة",
			},
			{
				href: "/analytics/progress",
				label: "التقدم الدراسي",
				icon: <TrendingUp className="h-4 w-4" />,
				description: "تتبع تقدمك الدراسي",
			},
			{
				href: "/analytics/performance",
				label: "الأداء",
				icon: <Activity className="h-4 w-4" />,
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
				icon: <FileText className="h-4 w-4" />,
				description: "التقارير التفصيلية",
			},
			{
				href: "/analytics/exports",
				label: "تصدير البيانات",
				icon: <Download className="h-4 w-4" />,
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
				icon: <ClipboardList className="h-4 w-4" />,
				description: "الامتحانات والاختبارات",
			},
			{
				href: "/teacher-exams",
				label: "امتحانات المعلمين",
				icon: <ClipboardList className="h-4 w-4" />,
				description: "امتحانات المعلمين",
			},
			{
				href: "/progress",
				label: "التقدم الدراسي",
				icon: <TrendingUp className="h-4 w-4" />,
				description: "تتبع تقدمك الدراسي",
			},
			{
				href: "/teachers",
				label: "المعلمين",
				icon: <GraduationCap className="h-4 w-4" />,
				description: "قائمة المعلمين",
			},
			{
				href: "/resources",
				label: "الموارد",
				icon: <FolderOpen className="h-4 w-4" />,
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
				icon: <MessageSquare className="h-4 w-4" />,
				description: "المنتدى التعليمي",
			},
			{
				href: "/chat",
				label: "الدردشة",
				icon: <Users className="h-4 w-4" />,
				description: "الدردشة مع المستخدمين",
			},
			{
				href: "/blog",
				label: "المدونة",
				icon: <FileText className="h-4 w-4" />,
				description: "المدونة التعليمية",
			},
			{
				href: "/announcements",
				label: "الإعلانات",
				icon: <Megaphone className="h-4 w-4" />,
				description: "الإعلانات والمسابقات",
			},
			{
				href: "/events",
				label: "المناسبات",
				icon: <Sparkles className="h-4 w-4" />,
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
				icon: <Trophy className="h-4 w-4" />,
				description: "إنجازاتك وميدالياتك",
			},
			{
				href: "/contests",
				label: "المسابقات",
				icon: <Trophy className="h-4 w-4" />,
				description: "المسابقات التعليمية",
			},
			{
				href: "/leaderboard",
				label: "لوحة المتصدرين",
				icon: <Award className="h-4 w-4" />,
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
				icon: <Brain className="h-4 w-4" />,
				description: "مساعد ذكي للتعلم",
				badge: "AI",
			},
			{
				href: "/goals",
				label: "الأهداف",
				icon: <Target className="h-4 w-4" />,
				description: "أهدافك الدراسية",
			},
			{
				href: "/tasks",
				label: "المهام",
				icon: <BookMarked className="h-4 w-4" />,
				description: "مهامك اليومية",
			},
			{
				href: "/tips",
				label: "النصائح",
				icon: <Lightbulb className="h-4 w-4" />,
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
				icon: <User className="h-4 w-4" />,
				description: "ملفك الشخصي",
			},
			{
				href: "/settings",
				label: "الإعدادات",
				icon: <Settings className="h-4 w-4" />,
				description: "إعدادات الحساب والمنصة",
			},
			{
				href: "/notifications",
				label: "الإشعارات",
				icon: <Bell className="h-4 w-4" />,
				description: "إشعاراتك الخاصة",
			},
			{
				href: "/security",
				label: "الأمان",
				icon: <Shield className="h-4 w-4" />,
				description: "إعدادات الأمان والحماية",
			},
			{
				href: "/security/activity",
				label: "سجل النشاط",
				icon: <Activity className="h-4 w-4" />,
				description: "سجل نشاطات الحساب",
			},
		],
	},
];

export const mainNavItemsWithMegaMenu: NavItemWithMegaMenu[] = [
	{
		href: "/",
		label: "الرئيسية",
		icon: <Home className="h-4 w-4" />,
		description: "الصفحة الرئيسية",
	},
	{
		href: "/courses",
		label: "الدورات",
		icon: <BookOpen className="h-4 w-4" />,
		description: "الدورات التعليمية",
		badge: "جديد",
		megaMenu: coursesMegaMenu,
	},
	{
		href: "/schedule",
		label: "الجدول الدراسي",
		icon: <Calendar className="h-4 w-4" />,
		description: "جدولك الدراسي",
		megaMenu: scheduleMegaMenu,
	},
	{
		href: "/time",
		label: "إدارة الوقت",
		icon: <Clock className="h-4 w-4" />,
		description: "تنظيم الوقت",
		megaMenu: timeManagementMegaMenu,
	},
	{
		href: "/library",
		label: "المكتبة",
		icon: <Library className="h-4 w-4" />,
		description: "المكتبة الرقمية",
		megaMenu: libraryMegaMenu,
	},
	{
		href: "/analytics",
		label: "التحليلات",
		icon: <BarChart3 className="h-4 w-4" />,
		description: "إحصائيات التقدم",
		megaMenu: analyticsMegaMenu,
	},
];


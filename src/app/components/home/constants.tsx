import React from "react";
import { 
  Rocket, Lightbulb, Calendar, Scroll, Sword, Shield, Crown, 
  Zap, Bell, Users, Bot, BarChart3, BookOpen, CalendarCheck, Headphones
} from "lucide-react";
import { FeatureItem } from "./types";

// --- Animations ---
export const scrollVariants = {
  fadeUp: {
    initial: { opacity: 0, y: 30 },
    whileInView: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } // Custom easing
    },
    viewport: { once: true, margin: "-50px" }
  },
  fadeLeft: {
    initial: { opacity: 0, x: -30 },
    whileInView: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    },
    viewport: { once: true, margin: "-50px" }
  },
  fadeRight: {
    initial: { opacity: 0, x: 30 },
    whileInView: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    },
    viewport: { once: true, margin: "-50px" }
  },
  scaleUp: {
    initial: { opacity: 0, scale: 0.9 },
    whileInView: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: "backOut" }
    },
    viewport: { once: true, margin: "-50px" }
  },
  staggerContainer: {
    initial: { opacity: 0 },
    whileInView: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    },
    viewport: { once: true, margin: "-50px" }
  }
};

// --- Styles ---
export const rpgCommonStyles = {
  // Enhanced premium deep dark glassmorphism
  glassPanel: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_40px_rgba(139,92,246,0.15)] hover:bg-white/[0.02]",
  
  // Text Effects
  neonText: "text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-indigo-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.3)] filter",
  goldText: "text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-[0_0_5px_rgba(251,191,36,0.4)] filter",
  
  // Utilities
  iconGlow: "filter drop-shadow-[0_0_8px_currentColor]",
  sectionPadding: "px-4 py-12 md:py-20",
  
  // RTL specifics (using logical properties where possible)
  rtlSpacing: "space-s-4" // margin-inline-start
};

export const rpgGradients = {
  primary: "bg-gradient-to-br from-violet-600/90 to-indigo-600/90",
  gold: "bg-gradient-to-br from-amber-400 to-yellow-600",
  danger: "bg-gradient-to-br from-rose-500 to-red-600",
  success: "bg-gradient-to-br from-emerald-500 to-green-600",
  dark: "bg-gradient-to-br from-slate-800 to-slate-900",
  blue: "bg-gradient-to-br from-blue-500 to-cyan-600",
  purple: "bg-gradient-to-br from-purple-500 to-fuchsia-600",
};

// --- Data ---
export const SUBJECT_EMOJIS: Record<string, string> = {
  "الرياضيات": "📐",
  "الكيمياء": "🧪",
  "الفيزياء": "⚡",
  "اللغة الإنجليزية": "📜",
  "اللغة العربية": "✒️",
  "العلوم": "🧬",
  "التاريخ": "🏺",
  "الجغرافيا": "🗺️",
  "الأحياء": "🦠",
  "الفلسفة": "🤔",
  "علم النفس": "🧠"
};

export const HIGHLIGHT_CARDS = [
  {
    title: "سجل المهام (Quest Log)",
    description: "تابع مهامك اليومية والأسبوعية، تماماً كما تتابع مهامك في اللعبة لتكسب نقاط الخبرة.",
    actionLabel: "إدارة المهام",
    href: "/tasks",
    accent: "from-sky-400/20 via-transparent to-indigo-400/20",
    icon: <Scroll className="h-6 w-6 text-indigo-400" />
  },
  {
    title: "ساحة التدريب (Time Track)",
    description: "راقب وقت تدريبك (دراستك) الفعلي لزيادة مستوى مهاراتك.",
    actionLabel: "تتبع الوقت",
    href: "/time",
    accent: "from-violet-400/15 via-transparent to-purple-400/20",
    icon: <Sword className="h-6 w-6 text-violet-400" />
  },
  {
    title: "تحذيرات المعركة (Alerts)",
    description: "لا تفوت أي معركة (امتحان) أو حدث مهم. نظام الإنذار المبكر يعمل لصالحك.",
    actionLabel: "عرض التنبيهات",
    href: "/notifications",
    accent: "from-emerald-400/15 via-transparent to-teal-400/20",
    icon: <Shield className="h-6 w-6 text-emerald-400" />
  }
];

export const FEATURES_LIST: FeatureItem[] = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "سرعة خارقة (Agility)",
    description: "واجهة سريعة الاستجابة تمنحك أفضلية في الوصول للمعلومة.",
    delay: 0.1,
    color: "text-yellow-400"
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "نظام الإنذار (Alerts)",
    description: "تنبيهات فورية للمهام والدروس، لا تدع أي عدو (امتحان) يباغتك.",
    delay: 0.2,
    badge: "مهم",
    color: "text-red-400"
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "التحالفات (Guilds)",
    description: "تواصل مع المدرسين وزملائك في الدراسة لتبادل الخبرات.",
    delay: 0.3,
    color: "text-blue-400"
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: "العراف الذكي (AI Oracle)",
    description: "ذكاء اصطناعي يساعدك في حل الألغاز المعقدة وإنشاء الاختبارات.",
    delay: 0.4,
    badge: "جديد",
    color: "text-purple-400"
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "سجل القتال (Stats)",
    description: "تتبع تقدمك وتحليل أدائك بتفصيل دقيق.",
    delay: 0.5,
    color: "text-green-400"
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "المخطوطات (Library)",
    description: "مكتبة شاملة للموارد التعليمية لجميع المواد.",
    delay: 0.6,
    color: "text-amber-400"
  },
  {
    icon: <CalendarCheck className="h-6 w-6" />,
    title: "خريطة المهام (Schedule)",
    description: "تنظيم جدول الدراسة والمهام تلقائياً حسب أولوياتك.",
    delay: 0.7,
    badge: "جديد",
    color: "text-cyan-400"
  },
  {
    icon: <Headphones className="h-6 w-6" />,
    title: "الدعم التقني (Support)",
    description: "فريق جاهز لمساندتك في أي وقت.",
    delay: 0.8,
    color: "text-pink-400"
  },
];

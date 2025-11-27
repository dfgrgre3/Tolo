import React from "react";
import { Rocket, Lightbulb, Calendar } from "lucide-react";

export const scrollVariants = {
  fadeUp: {
    initial: { opacity: 0, y: 50 },
    whileInView: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  fadeLeft: {
    initial: { opacity: 0, x: -50 },
    whileInView: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  fadeRight: {
    initial: { opacity: 0, x: 50 },
    whileInView: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  scaleUp: {
    initial: { opacity: 0, scale: 0.8 },
    whileInView: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    viewport: { once: true, margin: "-100px" }
  },
  staggerChildren: {
    initial: { opacity: 0 },
    whileInView: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    },
    viewport: { once: true, margin: "-100px" }
  },
  staggerItem: {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    viewport: { once: true, margin: "-50px" }
  }
};

export const highlightCards = [
  {
    title: "إدارة المهام الذكية",
    description: "نظم مهامك اليومية والأسبوعية بسهولة، واحصل على تذكيرات ذكية تساعدك على الالتزام بجدولك الدراسي.",
    actionLabel: "إدارة المهام",
    href: "/tasks",
    accent: "from-sky-400/20 via-transparent to-indigo-400/20",
    icon: <Rocket className="h-6 w-6 text-indigo-600" />
  },
  {
    title: "تتبع وقت الدراسة",
    description: "راقب وقت دراستك الفعلي، واحصل على إحصائيات دقيقة تساعدك على تحسين إدارة وقتك.",
    actionLabel: "تتبع الوقت",
    href: "/time",
    accent: "from-violet-400/15 via-transparent to-purple-400/20",
    icon: <Lightbulb className="h-6 w-6 text-violet-600" />
  },
  {
    title: "التنبيهات والتذكيرات",
    description: "لا تفوت أي موعد مهم. احصل على تذكيرات ذكية للامتحانات والدروس والأنشطة المهمة.",
    actionLabel: "عرض التنبيهات",
    href: "/notifications",
    accent: "from-emerald-400/15 via-transparent to-teal-400/20",
    icon: <Calendar className="h-6 w-6 text-emerald-600" />
  }
];

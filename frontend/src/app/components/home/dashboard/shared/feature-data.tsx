import { BookOpen, Bot, CalendarCheck, Headphones, Users, Zap } from "lucide-react";
import type { FeatureItem } from "./types";

export const FEATURES_LIST: FeatureItem[] = [
  { icon: <Zap className="h-6 w-6" />, title: "متابعة سريعة", description: "واجهة سريعة الاستجابة تمنحك وصولاً فورياً لدروسك ومهامك.", delay: 0.1, link: "/tasks", color: "text-yellow-400" },
  { icon: <Users className="h-6 w-6" />, title: "المجتمع", description: "تواصل مع المدرسين وزملائك في الدراسة لتبادل الخبرات.", delay: 0.3, link: "/forum", color: "text-blue-400" },
  { icon: <Bot className="h-6 w-6" />, title: "المساعد الذكي", description: "ذكاء اصطناعي يساعدك في شرح المسائل وإنشاء الاختبارات.", delay: 0.4, link: "/ai", color: "text-purple-400" },
  { icon: <BookOpen className="h-6 w-6" />, title: "المكتبة", description: "مكتبة شاملة للموارد التعليمية لجميع المواد.", delay: 0.6, link: "/resources", color: "text-amber-400" },
  { icon: <CalendarCheck className="h-6 w-6" />, title: "الجدول الدراسي", description: "تنظيم جدول الدراسة والمهام حسب أولوياتك.", delay: 0.7, link: "/schedule", color: "text-cyan-400" },
  { icon: <Headphones className="h-6 w-6" />, title: "الدعم الفني", description: "فريق جاهز لمساندتك في أي وقت.", delay: 0.8, link: "/support", color: "text-pink-400" },
];

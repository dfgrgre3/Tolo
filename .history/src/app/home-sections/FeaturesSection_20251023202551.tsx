"use client";

import { motion } from "framer-motion";
// import Link from "next/link"; // Removed: Caused error
// import { Button } from "@/shared/button"; // Removed: Caused error
// import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card"; // Removed: Caused error
// import { Badge } from "@/shared/badge"; // Removed: Caused error
import { Play, ChevronRight, Zap, Bell, Users, Bot, BarChart3, BookOpen, CalendarCheck, Headphones, Award, Globe } from 'lucide-react';
import React from "react"; // Added for JSX

// --- Mock Components (Standard HTML + Tailwind) ---
// Since we cannot import from @/shared, we create simple mockups.

// Mock Button
const Button = ({ variant, size, className, children, ...props }: {
  variant?: 'link' | 'secondary' | 'outline' | 'default',
  size?: 'lg' | 'default',
  className?: string,
  children: React.ReactNode,
  [key: string]: any; // for other props
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  let variantStyle = "bg-blue-600 text-white hover:bg-blue-700"; // default
  if (variant === 'link') {
    variantStyle = "p-0 h-auto font-normal text-blue-600 hover:underline";
  } else if (variant === 'secondary') {
    variantStyle = "bg-gray-100 text-gray-900 border-2 border-gray-200 hover:bg-gray-200";
  } else if (variant === 'outline') {
    variantStyle = "border-2 border-gray-300 hover:bg-blue-500/10";
  }

  const sizeStyle = size === 'lg' ? "px-8 py-3 text-lg h-auto" : "px-4 py-2"; // 'py-6' from original seems high, using py-3
  
  return (
    <button className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Mock Card components
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`border border-gray-200 bg-white text-gray-900 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

// Mock Badge
const Badge = ({ variant, className, children }: { variant?: string, className?: string, children: React.ReactNode }) => {
  let variantStyle = "bg-gray-100 text-gray-800"; // default (approximating secondary)
  if (className?.includes('bg-primary')) {
    variantStyle = "bg-blue-600 text-white";
  } else if (className?.includes('bg-primary/10')) {
    variantStyle = "bg-blue-100 text-blue-700";
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${variantStyle} ${className}`}>
      {children}
    </span>
  );
};

// Mock Link (using <a> tag)
const Link = ({ href, children, ...props }: { href: string, children: React.ReactNode, [key: string]: any }) => (
  <a href={href} {...props}>
    {children}
  </a>
);

// --- Original Component Code ---

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  badge?: string;
  link?: string;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "سرعة وسهولة الاستخدام",
    description: "واجهة عربية حديثة وسريعة الاستجابة لجميع الأجهزة.",
    delay: 0.1,
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "تنبيهات ذكية",
    description: "تذكيرات تلقائية للمهام والدروس والامتحانات.",
    delay: 0.2,
    badge: "مميز"
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "دعم المدرسين",
    description: "تواصل مباشر مع المدرسين ومتابعة الدروس أونلاين.",
    delay: 0.3,
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: "الذكاء الاصطناعي",
    description: "مساعد ذكي لإنشاء الامتحانات والنصائح التعليمية.",
    delay: 0.4,
    badge: "جديد"
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "تحليلات متقدمة",
    description: "تتبع التقدم وتحليل الأداء بتفصيل شامل.",
    delay: 0.5,
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "مكتبة شاملة",
    description: "موارد تعليمية متنوعة ومنظمة لجميع المواد.",
    delay: 0.6,
  },
  {
    icon: <CalendarCheck className="h-6 w-6" />,
    title: "جدولة ذكية",
    description: "تنظيم جدول الدراسة والمهام تلقائياً حسب أولوياتك.",
    delay: 0.7,
    badge: "جديد"
  },
  {
    icon: <Headphones className="h-6 w-6" />,
    title: "دعم فني متميز",
    description: "فريق دعم متاح على مدار الساعة لمساعدتك.",
    delay: 0.8,
  },
];

// Assuming colors for Tailwind from context:
// primary -> blue-600
// text-primary -> blue-600 or blue-700
// bg-primary/10 -> blue-100
// text-muted-foreground -> text-gray-600
// border-border -> border-gray-200

export function FeaturesSection() {
  return (
    <section aria-labelledby="features-heading" className="max-w-6xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 md:mb-14"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-4">
          <Badge variant="secondary" className="bg-blue-600 text-white">
            المميزات
          </Badge>
          <span className="text-sm font-medium text-blue-700">لماذا تختار منصة ثانوية؟</span>
        </div>
        <h2
          id="features-heading"
          className="text-2xl md:text-3xl font-bold mb-4 text-blue-700 flex items-center justify-center gap-2"
        >
          <span>مميزات المنصة</span>
          <span className="text-xl" aria-hidden="true">✨</span>
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          اكتشف المميزات التي تجعل منصة ثانوية بذكاء الخيار الأمثل لطلاب الثانوية
        </p>
      </motion.div>

      <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FEATURES.map((feature) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: feature.delay, duration: 0.5 }}
            whileHover={{ y: -5 }}
            className="h-full"
          >
            <Card className="h-full border-gray-200 group hover:border-blue-500/50 transition-colors duration-300 shadow-sm hover:shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200/70 transition-colors duration-300 text-blue-700">
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200/70">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg text-gray-900">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-gray-600 mb-4 text-sm">{feature.description}</p>
                <Button variant="link" className="p-0 h-auto font-normal text-blue-600 group/btn">
                  تعرف على المزيد
                  <ChevronRight className="mr-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="mt-16"
      >
        <Card className="border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md overflow-hidden">
          {/* CardContent for CTA card needs different padding */}
          <div className="py-8 md:py-10 px-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="text-center lg:text-right max-w-2xl">
                <h3 className="text-2xl md:text-3xl font-bold text-blue-700 mb-3 flex items-center justify-center lg:justify-start gap-2">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <span>انضم إلى مجتمع الطلاب المتميزين</span>
                </h3>
                <p className="text-gray-600 mb-5">
                  أكثر من 10,000 طالب يستخدمون منصتنا لتحسين أدائهم الأكاديمي وتحقيق نتائج متميزة في الثانوية العامة
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
                  <div className="flex items-center bg-white/80 px-3 py-1 rounded-full text-sm text-gray-800">
                    <Globe className="h-4 w-4 ml-1 text-blue-600" />
                    <span>جميع المحافظات</span>
                  </div>
                  <div className="flex items-center bg-white/80 px-3 py-1 rounded-full text-sm text-gray-800">
                    <Users className="h-4 w-4 ml-1 text-blue-600" />
                    <span>مدرسين خبراء</span>
                  </div>
                  <div className="flex items-center bg-white/80 px-3 py-1 rounded-full text-sm text-gray-800">
                    <BarChart3 className="h-4 w-4 ml-1 text-blue-600" />
                    <span>تقارير تقدم يومية</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <Link href="/register">
                  <Button size="lg" className="px-8 py-3 text-lg shadow hover:shadow-lg transition-shadow w-full sm:w-auto group bg-blue-600 text-white hover:bg-blue-700">
                    إنشاء حساب
                    <Play className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="px-8 py-3 text-lg border-2 hover:bg-blue-500/10 w-full sm:w-auto">
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="px-8 py-3 text-lg border-2 hover:bg-blue-500/10 w-full sm:w-auto">
                    مشاهدة العرض التوضيحي
                  </Button>
                </Link>
                {/* This is the new button added as requested */}
                <Link href="/login">
                  <Button size="lg" variant="outline" className="px-8 py-3 text-lg border-2 hover:bg-blue-500/10 w-full sm:w-auto">
                    تسجيل الدخول
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}

export default FeaturesSection;


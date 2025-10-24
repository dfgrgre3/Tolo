"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/shared/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Play, ChevronRight, Zap, Bell, Users, Bot, BarChart3, BookOpen, CalendarCheck, Headphones, Award, Globe } from 'lucide-react';

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

export function FeaturesSection() {
  return (
    <section aria-labelledby="features-heading" className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 md:mb-14"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
          <Badge variant="secondary" className="bg-primary text-primary-foreground">
            المميزات
          </Badge>
          <span className="text-sm font-medium text-primary">لماذا تختار منصة ثانوية؟</span>
        </div>
        <h2
          id="features-heading"
          className="text-2xl md:text-3xl font-bold mb-4 text-primary flex items-center justify-center gap-2"
        >
          <span>مميزات المنصة</span>
          <span className="text-xl" aria-hidden="true">✨</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
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
            <Card className="h-full border-border group hover:border-primary/50 transition-colors duration-300 shadow-sm hover:shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-muted-foreground mb-4 text-sm">{feature.description}</p>
                <Button variant="link" className="p-0 h-auto font-normal text-primary group/btn">
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
        <Card className="border-border bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md overflow-hidden">
          <CardContent className="py-8 md:py-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="text-center lg:text-right max-w-2xl">
                <h3 className="text-2xl md:text-3xl font-bold text-primary mb-3 flex items-center justify-center lg:justify-start gap-2">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <span>انضم إلى مجتمع الطلاب المتميزين</span>
                </h3>
                <p className="text-muted-foreground mb-5">
                  أكثر من 10,000 طالب يستخدمون منصتنا لتحسين أدائهم الأكاديمي وتحقيق نتائج متميزة في الثانوية العامة
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
                  <div className="flex items-center bg-white/80 px-3 py-1 rounded-full text-sm">
                    <Globe className="h-4 w-4 ml-1 text-primary" />
                    <span>جميع المحافظات</span>
                  </div>
                  <div className="flex items-center bg-white/80 px-3 py-1 rounded-full text-sm">
                    <Users className="h-4 w-4 ml-1 text-primary" />
                    <span>مدرسين خبراء</span>
                  </div>
                  <div className="flex items-center bg-white/80 px-3 py-1 rounded-full text-sm">
                    <BarChart3 className="h-4 w-4 ml-1 text-primary" />
                    <span>تقارير تقدم يومية</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <Link href="/login?view=register">
                  <Button size="lg" className="px-8 py-6 text-lg shadow hover:shadow-lg transition-shadow w-full sm:w-auto group">
                    إنشاء حساب
                    <Play className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-2 hover:bg-primary/5 w-full sm:w-auto">
                    مشاهدة العرض التوضيحي
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

export default FeaturesSection;

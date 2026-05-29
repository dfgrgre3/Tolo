import Link from "next/link";
import {
  Award,
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  CreditCard,
  GraduationCap,
  LineChart,
  Settings,
  Trophy,
  User,
  Users,
} from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { href: "/dashboard", title: "لوحة التحكم", description: "نظرة سريعة على نشاطك وآخر إنجازاتك.", icon: BarChart3 },
  { href: "/progress", title: "خريطة التقدم", description: "تابع مستواك والمهارات والمنحنيات الزمنية.", icon: LineChart },
  { href: "/tasks", title: "المهام", description: "نظم واجباتك وأهدافك اليومية والأسبوعية.", icon: CheckSquare },
  { href: "/schedule", title: "الجدول", description: "رتب مواعيد المذاكرة والاختبارات.", icon: Calendar },
  { href: "/achievements", title: "الإنجازات", description: "الأوسمة والترقيات وسجل المكافآت.", icon: Award },
  { href: "/leaderboard", title: "لوحة الشرف", description: "قارن ترتيبك وتقدمك مع الطلاب.", icon: Trophy },
  { href: "/time", title: "إدارة الوقت", description: "جلسات مذاكرة وتحليلات إنتاجية.", icon: Clock },
  { href: "/ai", title: "المساعد الذكي", description: "مساعدة دراسية وأسئلة مخصصة.", icon: Bot },
  { href: "/courses", title: "الكورسات", description: "استكشف المواد والدروس المتاحة.", icon: BookOpen },
  { href: "/teachers", title: "المدرسون", description: "ابحث عن المدرسين والمحتوى التعليمي.", icon: GraduationCap },
  { href: "/events", title: "الفعاليات", description: "أنشطة ومواعيد مجتمعية مهمة.", icon: Users },
  { href: "/notifications", title: "الإشعارات", description: "تابع التنبيهات والتحديثات الجديدة.", icon: Bell },
  { href: "/billing", title: "المحفظة والفواتير", description: "إدارة الرصيد والمدفوعات والاشتراك.", icon: CreditCard },
  { href: "/profile", title: "الملف الشخصي", description: "بياناتك ومستواك ومعلومات الحساب.", icon: User },
  { href: "/settings", title: "الإعدادات", description: "الأمان والخصوصية وتفضيلات الحساب.", icon: Settings },
];

export default function AllFeaturesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-bold text-primary">كل الأدوات في مكان واحد</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">كل الميزات</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            اختار القسم الذي تحتاجه للمتابعة بسرعة داخل المنصة.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link key={feature.href} href={feature.href} className="group block h-full">
                <Card className="h-full rounded-lg border-border/70 bg-card/80 transition-colors hover:border-primary/50 hover:bg-card">
                  <CardHeader className="flex-row items-start gap-4 space-y-0">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 space-y-2">
                      <CardTitle className="text-lg font-black leading-7">{feature.title}</CardTitle>
                      <CardDescription className="leading-6">{feature.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

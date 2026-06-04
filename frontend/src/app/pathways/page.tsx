import type { Metadata } from "next";
import { Map, Compass, Shield, Sword, Star, Zap, Trophy, BookOpen, Brain, Target } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "مسارات التعلم | TOLO",
  description: "اختر مسار تعلمك في مملكة TOLO. من مبتدئ إلى بطل — طريقك للتفوق يبدأ هنا.",
};

const pathways = [
  {
    id: "math",
    icon: <Brain className="w-8 h-8" />,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    title: "مسار الرياضيات",
    subtitle: "من المعادلات إلى التفاضل والتكامل",
    level: "مبتدئ → متقدم",
    chapters: 12,
    xp: "5000 نقطة XP",
    description: "أتقن الجبر، الهندسة، التفاضل والتكامل بأسلوب مغامرة تعليمية مثيرة.",
    tags: ["جبر", "هندسة", "تفاضل"],
  },
  {
    id: "physics",
    icon: <Zap className="w-8 h-8" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "مسار الفيزياء",
    subtitle: "قوانين الكون في يدك",
    level: "مبتدئ → متقدم",
    chapters: 10,
    xp: "4500 نقطة XP",
    description: "استكشف قوانين الحركة، الكهرباء، والمجالات في رحلة علمية ملحمية.",
    tags: ["ميكانيكا", "كهرباء", "ضوء"],
  },
  {
    id: "chemistry",
    icon: <Target className="w-8 h-8" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "مسار الكيمياء",
    subtitle: "تحويل العناصر إلى علم",
    level: "مبتدئ → متقدم",
    chapters: 9,
    xp: "4000 نقطة XP",
    description: "افهم التفاعلات الكيميائية والمعادلات والجدول الدوري بطريقة تفاعلية.",
    tags: ["عضوية", "غير عضوية", "تحليل"],
  },
  {
    id: "arabic",
    icon: <BookOpen className="w-8 h-8" />,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    title: "مسار اللغة العربية",
    subtitle: "لغة الضاد بلا حدود",
    level: "متوسط → متقدم",
    chapters: 8,
    xp: "3500 نقطة XP",
    description: "اللغة والنحو والبلاغة والأدب في منظومة متكاملة للتفوق في الثانوية.",
    tags: ["نحو", "بلاغة", "أدب"],
  },
  {
    id: "english",
    icon: <Compass className="w-8 h-8" />,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    title: "مسار اللغة الإنجليزية",
    subtitle: "افتح أبواب العالم",
    level: "مبتدئ → متقدم",
    chapters: 10,
    xp: "4000 نقطة XP",
    description: "Grammar, vocabulary, reading comprehension وكتابة الإنشاء للثانوية العامة.",
    tags: ["Grammar", "Reading", "Writing"],
  },
  {
    id: "biology",
    icon: <Shield className="w-8 h-8" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    title: "مسار الأحياء",
    subtitle: "سر الحياة في خلية",
    level: "مبتدئ → متقدم",
    chapters: 11,
    xp: "4200 نقطة XP",
    description: "الخلية، الجينات، الأجهزة الحيوية، والتطور في رحلة بيولوجية شاملة.",
    tags: ["خلايا", "جينات", "أجهزة"],
  },
];

export default function PathwaysPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/10 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-20 space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <Map className="h-4 w-4" />
            <span>خريطة المملكة التعليمية</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
            اختر{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">
              مسارك
            </span>
            {" "}البطولي
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            كل مسار هو رحلة ملحمية مصممة لتوصلك من الصفر إلى التفوق. اختر سلاحك وابدأ القتال.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          {[
            { icon: <Trophy className="w-6 h-6 text-amber-400" />, label: "مسار متاح", value: "6+" },
            { icon: <Star className="w-6 h-6 text-primary" />, label: "درس تفاعلي", value: "500+" },
            { icon: <Sword className="w-6 h-6 text-blue-400" />, label: "طالب متفوق", value: "10K+" },
          ].map((stat, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 text-center"
            >
              <div className="flex justify-center mb-3">{stat.icon}</div>
              <p className="text-3xl font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pathways Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pathways.map((path) => (
            <Link
              key={path.id}
              href={`/courses?subject=${path.id}`}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 block"
            >
              {/* Icon */}
              <div className={`inline-flex p-4 rounded-2xl border ${path.bg} ${path.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {path.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-black mb-1">{path.title}</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-4">{path.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{path.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {path.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-white/5 border border-border text-xs font-bold text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{path.chapters} فصل</p>
                  <p className="text-xs font-black text-primary">{path.xp}</p>
                </div>
                <div className="text-xs font-bold text-muted-foreground bg-white/5 border border-border rounded-full px-3 py-1">
                  {path.level}
                </div>
              </div>

              {/* Hover Arrow */}
              <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Compass className="w-5 h-5 text-primary" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center relative overflow-hidden rounded-3xl border border-border bg-card/40 p-16">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <Map className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-3xl font-black">لا تعرف من أين تبدأ؟</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              سجّل الدخول واختبر مستواك الحالي. سنختار لك المسار المثالي تلقائياً.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:scale-105 transition-transform"
              >
                <Sword className="w-4 h-4" />
                ابدأ مجاناً
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-white/5 font-bold rounded-2xl hover:bg-white/10 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                استعرض الكورسات
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

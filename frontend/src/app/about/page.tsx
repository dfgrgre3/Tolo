import type { Metadata } from "next";
import { Shield, Star, Zap, Users, Crown, Target, Heart, Compass } from "lucide-react";
import Link from "next/link";
import { SITE } from "@thanawy/shared/site-config";
import { AboutStats } from "@/app/about/AboutStats";

export const metadata: Metadata = {
  title: `عن ${SITE.name} | منصة تعليمية متكاملة`,
  description: `تعرّف على قصة ${SITE.name} — المنصة التعليمية العربية المتكاملة. مهمتنا، رؤيتنا، وفريقنا.`,
};

const values = [
  {
    icon: <Crown className="w-7 h-7" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "التميز في الجودة",
    description: "نؤمن أن كل طالب يستحق أفضل تجربة تعليمية. لا مساومة في جودة المحتوى والشرح.",
  },
  {
    icon: <Zap className="w-7 h-7" />,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    title: "الإبداع والابتكار",
    description: "نستخدم أحدث تقنيات التعليم الإلكتروني والذكاء الاصطناعي لتقديم تجربة تعلم فريدة.",
  },
  {
    icon: <Heart className="w-7 h-7" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    title: "شغف التعليم",
    description: "فريقنا من المعلمين والمطورين يعمل من أجل نجاح كل طالب بشغف حقيقي.",
  },
  {
    icon: <Users className="w-7 h-7" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "مجتمع داعم",
    description: "نبني مجتمعاً من المتعلمين والمعلمين يدعمون بعضهم ويتبادلون المعرفة.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/10 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/10 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center mb-24 space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary-strong">
            <Shield className="h-4 w-4" />
            <span>قصتنا</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
            نحن لسنا مجرد{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">
              منصة تعليمية
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed">
            {SITE.name} وُلدت من إيمان راسخ بأن التعليم الجيد حق لكل طالب عربي.
            نحن نبني منصة تجعل التعلم ممتعاً وفعالاً ومتاحاً للجميع.
          </p>
        </div>

        {/* Story + Real Stats from Backend */}
        <div className="py-10 md:py-16 mb-20 border-t border-b border-border">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-black">كيف بدأت القصة؟</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  في عام 2024، لاحظنا أن الطلاب يحتاجون إلى منصة تعليمية عربية
                  متكاملة تجمع بين جودة المحتوى وسهولة الاستخدام.
                </p>
                <p>
                  قررنا بناء {SITE.name} لنقدم تجربة تعليمية مختلفة — كورسات احترافية،
                  معلمون مؤهلون، وأدوات ذكية تساعد كل طالب على تحقيق أهدافه.
                </p>
                <p>
                  اليوم، {SITE.name} تخدم مجتمعاً متنامياً من الطلاب والمعلمين
                  الذين يسعون معاً نحو التفوق والنجاح.
                </p>
              </div>
            </div>
            {/* Stats fetched from the real backend API */}
            <AboutStats />
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-black">قيم {SITE.name}</h2>
            <p className="text-muted-foreground">المبادئ التي تحكم كل قرار نتخذه</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((val, i) => (
              <div
                key={i}
                className="relative py-8 border-t border-border group"
              >
                <div className={`inline-flex p-3 rounded-xl border ${val.bg} ${val.color} mb-5 group-hover:scale-110 transition-transform`}>
                  {val.icon}
                </div>
                <h3 className="text-xl font-black mb-3">{val.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{val.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="relative py-12 md:py-20 border-t border-b border-border text-center mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <Target className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-3xl md:text-5xl font-black">مهمتنا</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              تمكين كل طالب عربي من الوصول إلى تعليم عالي الجودة،
              بأسلوب ممتع ومحفّز، يجعله يتوق إلى المزيد من التعلم كل يوم.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
              <Star className="w-4 h-4 text-amber-400" />
              <span>نعيد تعريف ما يعنيه التفوق</span>
              <Star className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-black">انضم إلينا اليوم</h2>
          <p className="text-muted-foreground">كن جزءاً من مجتمع {SITE.name} التعليمي.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-black rounded-2xl hover:scale-105 transition-transform"
            >
              <Crown className="w-4 h-4" />
              ابدأ التعلم
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-white/5 font-bold rounded-2xl hover:bg-white/10 transition-colors"
            >
              <Compass className="w-4 h-4" />
              تواصل معنا
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

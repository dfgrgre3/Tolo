"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Sparkles, 
  Shield, 
  Sword, 
  Scroll, 
  Zap, 
  Info,
  BookOpen,
  Target,
  Flame,
  Brain,
  Compass,
  Star,
  Eye,
  Activity
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all hover:scale-[1.02]",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function TipsPage() {
  const categories = [
    {
      title: "فنون التركيز والاستذكار",
      icon: Brain,
      color: "text-blue-400",
      tips: [
        { label: "الاسترجاع النشط", desc: "اختبر نفسك بعد كل فقرة. المعرفة لا تثبت إلا بالمواجهة." },
        { label: "التكرار المتباعد", desc: "راجع بعد يوم، 3 أيام، ثم أسبوع. التكرار هو سلاح الحكماء." },
        { label: "خلط المواضيع", desc: "بدّل بين المواد بذكاء. فالعقل يتطور بتنويع التحديات." }
      ]
    },
    {
      title: "استراتيجيات المعارك (الامتحانات)",
      icon: Sword,
      color: "text-red-400",
      tips: [
        { label: "محاكاة الزمن", desc: "حل نماذج السنوات السابقة تحت ضغط زمن حقيقي لتعتاد المعمعة." },
        { label: "اللفائف الخلاصة", desc: "صِغ ملخصات مركزة من صفحتين لكل درس، لتكون ذخيرتك السريعة." },
        { label: "تكتيك الأخطاء", desc: "حل أخطاءك القديمة أولاً. قهر نقاط ضعفك هو أعظم انتصاراتك." }
      ]
    }
  ];

  const subjects = [
    { name: "الرياضيات", desc: "حل مسائل متنوعة يوميًا وراجع القوانين بتلخيص بصري مكثف.", icon: activity },
    { name: "الفيزياء", desc: "افهم القوى الخفية وراء المفاهيم ثم طبّقها بتجارب افتراضية.", icon: zap },
    { name: "الكيمياء", desc: "اربط المعادلات بالتفاعل الملموس واستخدم جداولك التفاعلية.", icon: spark },
    { name: "اللغات", desc: "عضلاتك اللغوية تنمو بالمفردات اليومية والتدريب الكتابي المستمر.", icon: scroll }
  ];

  function activity(props: any) { return <Activity {...props} /> }
  function zap(props: any) { return <Zap {...props} /> }
  function spark(props: any) { return <Sparkles {...props} /> }
  function scroll(props: any) { return <Scroll {...props} /> }

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full opacity-40 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[130px] rounded-full opacity-20 -translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        
        {/* --- Header: Wisdom Arrival --- */}
        <motion.div
           initial={{ opacity: 0, y: -30 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-center space-y-6"
        >
           <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
              <Lightbulb className="h-5 w-5" />
              <span>خزانة الحكمة المفقودة</span>
           </div>
           <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
              لفائف <span className={STYLES.neonText}>الإتقان</span> 🔮
           </h1>
           <p className="text-lg md:text-xl text-gray-400 font-medium max-w-3xl mx-auto leading-relaxed">
              استراتيجيات وتكتيكات محصنة باليقين، جمعها لك كبار الحكماء لتختصر عليك طريق السيادة وتضاعف من سرعة تطورك العلمي.
           </p>
        </motion.div>

        {/* --- Categories Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={STYLES.glass + " p-10 group hover:border-primary/50 transition-all"}
              >
                 <div className="flex items-center gap-6 mb-8">
                    <div className={`p-4 rounded-3xl bg-white/5 border border-white/10 ${cat.color} group-hover:scale-110 transition-transform`}>
                       <cat.icon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-white">{cat.title}</h2>
                 </div>
                 <div className="space-y-6">
                    {cat.tips.map((tip, j) => (
                       <div key={j} className="flex gap-4 group/tip">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)] shrink-0" />
                          <div className="space-y-1">
                             <h4 className="font-black text-white text-lg group-hover/tip:text-primary transition-colors">{tip.label}</h4>
                             <p className="text-gray-500 font-medium leading-relaxed">{tip.desc}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </motion.div>
           ))}
        </div>

        {/* --- Subject-Specific Wisdom --- */}
        <div className="space-y-8 pt-12">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                 <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                 <h2 className="text-2xl font-black text-white">دروس حسب كل مادة</h2>
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">توجيهات مخصصة لكل اختصاص</p>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {subjects.map((sub, i) => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className={STYLES.glass + " p-8 space-y-4 group hover:bg-primary/5 transition-all text-center"}
                 >
                    <div className="p-4 bg-white/5 rounded-2xl w-max mx-auto group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                       <sub.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-black text-white">{sub.name}</h3>
                    <p className="text-[11px] text-gray-500 font-bold leading-relaxed">{sub.desc}</p>
                 </motion.div>
              ))}
           </div>
        </div>

        {/* --- Bottom Call to Action: The Oath --- */}
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           className={STYLES.glass + " p-12 text-center border-emerald-500/20 shadow-emerald-500/5"}
        >
           <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-4 bg-emerald-500/10 rounded-full w-max mx-auto border border-emerald-500/30">
                 <Shield className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-white">هل أنت مستعد لتطبيق هذه الاستراتيجيات؟</h2>
              <p className="text-gray-500 font-medium">المعرفة بدون فعل هي سيف صدئ. انطلق الآن إلى لوحة التحكم وطبق تكتيكات الاسترجاع النشط في دراسة المادة القادمة.</p>
              <div className="pt-4">
                 <Badge className="bg-emerald-500 text-black font-black px-6 h-10 text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20">انطلق للمهمة التالية &gt;</Badge>
              </div>
           </div>
        </motion.div>
      </div>
    </div>
  );
}

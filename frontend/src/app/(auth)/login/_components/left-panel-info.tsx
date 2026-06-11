'use client';

import { m, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Sparkles, BookOpen, Users, Trophy, Brain, GraduationCap, Star } from 'lucide-react';

interface LeftPanelInfoProps {
  readonly deviceInfo: {
    readonly os: string;
    readonly browser: string;
  };
}

const FEATURE_CARDS = [
  { icon: BookOpen, label: "محتوى تفاعلي", sub: "آلاف الدروس المنسقة", color: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20", iconColor: "text-blue-400", id: "books" },
  { icon: Brain, label: "ذكاء اصطناعي", sub: "مساعد تعلم شخصي", color: "from-purple-500/20 to-purple-600/5", border: "border-purple-500/20", iconColor: "text-purple-400", id: "brain" },
  { icon: Trophy, label: "شهادات معتمدة", sub: "اكتسب مهارات حقيقية", color: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/20", iconColor: "text-amber-400", id: "trophy" },
  { icon: Users, label: "مجتمع نشط", sub: "+٥٠,٠٠٠ متعلم", color: "from-green-500/20 to-green-600/5", border: "border-green-500/20", iconColor: "text-green-400", id: "users" },
] as const;

const TESTIMONIALS = [
  { name: "أحمد محمد", role: "طالب هندسة", text: "تولو غيّرت طريقة تعلمي تماماً!", avatar: "أ" },
  { name: "سارة علي", role: "معلمة رياضيات", text: "أفضل منصة تعليمية عربية على الإطلاق", avatar: "س" },
];

export function LeftPanelInfo({ deviceInfo }: LeftPanelInfoProps) {
  return (
    <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 bg-gradient-to-br from-white/[0.02] to-transparent border-l border-white/5 relative overflow-hidden">
      {/* Subtle glow effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-10 relative z-10">
        {/* Logo / Brand */}
        <m.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shadow-[0_0_25px_rgba(255,109,0,0.15)]">
            <GraduationCap className="text-primary w-6 h-6" />
          </div>
          <div>
            <h4 className="text-white font-black text-lg tracking-tight">منصة تولو</h4>
            <p className="text-primary/50 text-[9px] font-black uppercase tracking-[0.35em]">Educational Platform</p>
          </div>
        </m.div>

        {/* Hero text */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
            <Sparkles size={10} />
            التعلم الذكي المخصص
          </div>
          <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter">
            ارتقِ بمستواك<br />
            <span className="bg-gradient-to-l from-primary to-orange-300 bg-clip-text text-transparent">
              إلى الأمام
            </span>
          </h2>
          <p className="text-gray-400 text-base font-medium leading-relaxed max-w-xs">
            انضم لأكثر من ٥٠,٠٠٠ متعلم يطورون مهاراتهم يومياً مع تولو.
          </p>
        </m.div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURE_CARDS.map((item, idx) => (
            <m.div
              key={item.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + idx * 0.08, duration: 0.5, ease: 'backOut' }}
              className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} border ${item.border} space-y-3 hover:scale-[1.02] transition-transform cursor-default`}
            >
              <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              <div>
                <div className="text-white font-bold text-xs">{item.label}</div>
                <div className="text-gray-500 text-[9px] font-bold mt-0.5">{item.sub}</div>
              </div>
            </m.div>
          ))}
        </div>
      </div>

      {/* Bottom: Testimonial carousel */}
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="relative z-10 space-y-4"
      >
        {/* Stars rating */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={`star-${i}`} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          ))}
          <span className="text-gray-500 text-[10px] font-bold mr-1">٤.٩ / ٥ من آلاف المراجعات</span>
        </div>

        {/* Testimonial */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-black text-sm">{TESTIMONIALS[0].avatar}</span>
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-gray-300 text-[11px] font-medium leading-relaxed">"{TESTIMONIALS[0].text}"</p>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary w-3 h-3" />
                <span className="text-gray-500 text-[9px] font-black uppercase tracking-wider">{TESTIMONIALS[0].name} · {TESTIMONIALS[0].role}</span>
              </div>
            </div>
          </div>
        </div>
      </m.div>
    </div>
  );
}

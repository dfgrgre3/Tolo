'use client';

import { m } from 'framer-motion';
import { ShieldCheck, Sparkles, Fingerprint, Globe, Zap, History, Cpu } from 'lucide-react';

interface LeftPanelInfoProps {
  readonly deviceInfo: {
    readonly os: string;
    readonly browser: string;
  };
}

const INFO_ITEMS = [
  { icon: Fingerprint, label: "بصمة رقمية", sub: "AES-256 GCM", id: "fingerprint" },
  { icon: Globe, label: "سحابة تولو", sub: "Edge Network", id: "globe" },
  { icon: Zap, label: "ذكاء اصطناعي", sub: "Adaptive Security", id: "zap" },
  { icon: History, label: "سجل الأمان", sub: "Live Monitoring", id: "history" }
] as const;

export function LeftPanelInfo({ deviceInfo }: LeftPanelInfoProps) {
  return (
    <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-16 bg-gradient-to-br from-white/[0.03] to-transparent border-l border-white/5 relative group">
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="space-y-16 relative z-10">
        <m.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,109,0,0.2)]">
            <ShieldCheck className="text-primary w-7 h-7" />
          </div>
          <div>
            <h4 className="text-white font-black text-xl tracking-tight">نظام تولو الموحد</h4>
            <p className="text-primary/50 text-[10px] font-black uppercase tracking-[0.3em]">Quantum-Ready Auth</p>
          </div>
        </m.div>

        <div className="space-y-12">
          <m.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
              <Sparkles size={12} />
              إصدار 2.5 المستقر
            </div>
            <h2 className="text-6xl font-black text-white leading-[1.1] tracking-tighter">
              ولوج ذكي<br />
              <span className="text-primary">لمستقبلك</span>
            </h2>
            <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-sm">
              استمتع بتجربة تعليمية فريدة مدعومة بأقوى أنظمة التشفير والحماية العالمية.
            </p>
          </m.div>

          <div className="grid grid-cols-2 gap-5">
            {INFO_ITEMS.map((item, idx) => (
              <m.div
                key={item.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-4 hover:bg-white/10 hover:border-primary/20 transition-all cursor-default group/card"
              >
                <item.icon className="text-primary w-6 h-6 group-hover/card:scale-110 transition-transform" />
                <div>
                  <div className="text-white font-bold text-sm">{item.label}</div>
                  <div className="text-gray-500 text-[9px] uppercase font-black tracking-widest group-hover/card:text-primary/60 transition-colors">{item.sub}</div>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </div>

      <m.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex items-center gap-6 p-7 rounded-[2rem] bg-primary/5 border border-primary/10 backdrop-blur-md"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
          <Cpu className="text-primary w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-white font-black text-xs uppercase tracking-wider">الجهاز موثوق</p>
          </div>
          <p className="text-gray-500 text-[10px] font-bold leading-none">
            {deviceInfo.browser} / {deviceInfo.os} | <span className="text-primary/40">Secure Node #781</span>
          </p>
        </div>
      </m.div>
    </div>
  );
}

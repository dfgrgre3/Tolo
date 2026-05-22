'use client';

import { m } from 'framer-motion';
import { ShieldCheck, GraduationCap, Briefcase, ArrowRight } from 'lucide-react';
import { type UseFormRegister } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RoleStep({
  register, roleValue, onNext
}: {
  readonly register: UseFormRegister<any>;
  readonly roleValue: string;
  readonly onNext: () => void;
}) {
  return (
    <m.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
      <div className="text-center space-y-3">
        <ShieldCheck className="mx-auto text-primary animate-pulse" size={40} />
        <h3 className="text-3xl font-black text-white uppercase">تحديد نوع الحساب</h3>
        <p className="text-gray-500 font-bold">كل هوية تمنحك صلاحيات وأدوات مختلفة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {[
          { id: 'STUDENT', label: 'طالب معرفة', icon: GraduationCap, desc: 'للتفوق والتحدي' },
          { id: 'TEACHER', label: 'معلم خبير', icon: Briefcase, desc: 'لنشر العلم' }
        ].map(({ id, label, icon: Icon, desc }) => {
          const active = roleValue === id;
          return (
            <m.label
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              key={id}
              className={cn(
                "group cursor-pointer rounded-[2.5rem] border-2 p-12 transition-all text-center space-y-6",
                active ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-2xl shadow-primary/10" : "border-white/5 bg-white/5 hover:border-white/10"
              )}
            >
              <input type="radio" value={id} {...register('role')} className="hidden" />
              <m.div
                animate={{
                  backgroundColor: active ? "rgba(255,109,0,1)" : "rgba(255,255,255,0.05)",
                  color: active ? "#000" : "#6b7280"
                }}
                className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center transition-all"
              >
                <Icon size={48} />
              </m.div>
              <div className="space-y-2">
                <span className={cn("block font-black text-2xl transition-colors", active ? "text-white" : "text-gray-500")}>{label}</span>
                <span className="block text-[11px] text-gray-600 font-black uppercase tracking-widest">{desc}</span>
              </div>
            </m.label>
          );
        })}
      </div>

      <div className="pt-6">
        <Button type="button" onClick={onNext} className="h-20 w-full rounded-2xl bg-primary font-black text-black text-xl shadow-2xl group overflow-hidden relative">
          <m.div className="absolute inset-0 bg-white/20" initial={{ y: "100%" }} whileHover={{ y: 0 }} transition={{ duration: 0.3 }} />
          <div className="relative z-10 flex items-center justify-center gap-3">
            متابعة الخطوات <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </div>
        </Button>
      </div>
    </m.div>
  );
}

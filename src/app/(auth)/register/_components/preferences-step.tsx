'use client';

import { m, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STUDENT_GRADES = ['أولى إعدادي', 'ثانية إعدادي', 'ثالثة إعدادي', 'أولى ثانوي', 'ثانية ثانوي', 'ثالثة ثانوي'];
const EDUCATION_TYPES = ['عام', 'أزهري', 'دولي', 'IG', 'American', 'أخرى'];
const SUBJECTS = ['رياضيات', 'فيزياء', 'كيمياء', 'برمجة', 'إنجليزي', 'تصميم', 'لغة عربية', 'أحياء', 'تاريخ', 'جغرافيا'];

export function PreferencesStep({
  register, errors, interestedSubjects, toggleArrayItem, acceptTerms, onBack, isLoading
}: {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  interestedSubjects: string[];
  toggleArrayItem: (field: 'interestedSubjects', value: string) => void;
  acceptTerms: boolean;
  onBack: () => void;
  isLoading: boolean;
}) {
  return (
    <m.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-2">المستوى الدراسي</Label>
          <select {...register('gradeLevel')} className="w-full h-16 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none focus:border-primary/50 transition-all cursor-pointer">
            <option value="" className="bg-[#0a0a0a]">اختر المستوى</option>
            {STUDENT_GRADES.map((g) => <option key={g} value={g} className="bg-[#0a0a0a]">{g}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-2">الفرع التعليمي</Label>
          <select {...register('educationType')} className="w-full h-16 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none focus:border-primary/50 transition-all cursor-pointer">
            <option value="" className="bg-[#0a0a0a]">اختر الفرع</option>
            {EDUCATION_TYPES.map((e) => <option key={e} value={e} className="bg-[#0a0a0a]">{e}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        <Label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-2 block">المواد المفضلة</Label>
        <div className="flex flex-wrap gap-3">
          {SUBJECTS.map((subject) => {
            const selected = interestedSubjects.includes(subject);
            return (
              <m.button whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} key={subject} type="button"
                onClick={() => toggleArrayItem('interestedSubjects', subject)}
                className={cn("px-8 h-14 rounded-2xl border text-[12px] font-black transition-all",
                  selected ? "border-primary bg-primary text-black shadow-lg shadow-primary/20" : "border-white/5 bg-white/5 text-gray-500 hover:border-white/20"
                )}>
                {subject}
              </m.button>
            );
          })}
        </div>
      </div>

      <m.label whileHover={{ backgroundColor: "rgba(255,109,0,0.1)" }}
        className="flex items-start gap-6 rounded-[2.5rem] border border-primary/20 bg-primary/5 p-10 cursor-pointer transition-all">
        <div className="relative flex items-center pt-1 shrink-0">
          <input type="checkbox" {...register('acceptTerms')} className="peer sr-only" />
          <div className="h-7 w-7 rounded-lg border-2 border-white/10 bg-white/5 transition-all peer-checked:border-primary peer-checked:bg-primary/20 flex items-center justify-center">
            <m.div animate={{ opacity: acceptTerms ? 1 : 0, scale: acceptTerms ? 1 : 0 }} className="text-primary">
              <Check className="h-4 w-4 stroke-[4px]" />
            </m.div>
          </div>
        </div>
        <span className="text-sm font-bold text-gray-400 leading-relaxed">
          أوافق على كافة <Link href="/terms" className="text-primary font-black underline">الشروط والأحكام</Link> المتبعة في نظام تولو الذكي وأتعهد بالحفاظ على سرية بيانات الولوج الخاصة بي.
        </span>
      </m.label>
      <AnimatePresence>
        {errors.acceptTerms && (
          <m.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="text-[11px] font-bold text-red-500 pr-4">{errors.acceptTerms.message as string}</m.p>
        )}
      </AnimatePresence>

      <div className="flex gap-6">
        <Button type="button" variant="outline" onClick={onBack}
          className="h-20 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white text-xl hover:bg-white/10 transition-colors">سابـق</Button>
        <Button type="submit" disabled={isLoading}
          className="h-20 flex-[2] rounded-2xl bg-primary text-black font-black text-2xl shadow-2xl relative overflow-hidden group">
          <m.div className="absolute inset-0 bg-white/20" initial={{ y: "100%" }} whileHover={{ y: 0 }} transition={{ duration: 0.3 }} />
          <div className="relative z-10">{isLoading ? <Loader2 className="h-10 w-10 animate-spin mx-auto" /> : "إكمال بناء الهوية"}</div>
        </Button>
      </div>
    </m.div>
  );
}

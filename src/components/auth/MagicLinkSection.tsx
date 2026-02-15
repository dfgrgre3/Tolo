'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface MagicLinkSectionProps {
  onBack: () => void;
}

export const MagicLinkSection: React.FC<MagicLinkSectionProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSent(true);
        toast.success('تم إرسال رابط تسجيل الدخول بنجاح');
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إرسال الرابط');
      }
    } catch (error) {
      toast.error('فشل الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">تحقق من بريدك الإلكتروني</h3>
        <p className="text-slate-400 mb-8 max-w-[280px] mx-auto">
          لقد أرسلنا رابط تسجيل الدخول السحري إلى <span className="text-indigo-400 font-medium">{email}</span>. يرجى الضغط عليه للمتابعة.
        </p>
        <button
          onClick={onBack}
          className="text-sm font-medium text-slate-500 hover:text-white transition-colors"
        >
          الرجوع لتسجيل الدخول
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
          <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-white">تسجيل دخول سحري</h3>
        <p className="text-sm text-slate-400 mt-1">سنقوم بإرسال رابط آمن لبريدك الإلكتروني</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className={`absolute top-0 bottom-0 right-0 w-12 flex items-center justify-center text-slate-500 transition-colors`}>
            <Mail className="w-5 h-5" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20"
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>إرسال الرابط السحري</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
              </>
            )}
          </div>
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          أو عد لاستخدام كلمة المرور
        </button>
      </div>
    </div>
  );
};

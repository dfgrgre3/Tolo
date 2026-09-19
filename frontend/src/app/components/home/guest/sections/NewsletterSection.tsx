'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import { TYPOGRAPHY, SECTION } from '../design-system';

type SubscribeStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Newsletter sign-up through the canonical backend API.
 */
export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubscribeStatus>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setStatus('loading');
    try {
      await apiClient.post('/newsletter/subscribe', { email });
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className={SECTION.padding}>
      <div className="max-w-3xl mx-auto px-4 text-center space-y-5">
        <div className="h-12 w-12 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F766E] mx-auto flex items-center justify-center dark:bg-slate-900 dark:border-slate-700 dark:text-orange-500">
          <Mail className="h-6 w-6" />
        </div>
        <div>
          <h2 className={TYPOGRAPHY.sectionHeading}>اشترك في نشرتنا البريدية</h2>
          <p className={TYPOGRAPHY.sectionSubheading}>
            احصل على أحدث الكورسات، المقالات التعليمية، والعروض الحصرية مباشرة في بريدك
          </p>
        </div>

        <form
          onSubmit={handleSubscribe}
          className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="أدخل بريدك الإلكتروني"
            className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#0F766E] text-[#1E293B] focus:ring-2 focus:ring-[#0F766E]/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:focus:border-orange-500 dark:focus:ring-orange-500/20"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full sm:w-auto px-6 py-3 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-sm rounded-xl shrink-0 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Send className="h-4 w-4" />
            {status === 'loading' ? 'جاري الاشتراك...' : 'اشترك'}
          </button>
        </form>

        {status === 'success' && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4" />
            تم اشتراكك في النشرة البريدية بنجاح!
          </div>
        )}
        {status === 'error' && (
          <p className="text-xs font-bold text-red-600">
            حدث خطأ أثناء الاشتراك، يرجى المحاولة لاحقاً.
          </p>
        )}

        <p className="text-[10px] text-[#94A3B8]">
          بالاشتراك، أنت توافق على سياسة الخصوصية. يمكنك إلغاء الاشتراك في أي وقت.
        </p>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supportService } from '@/services/api/support-service';
import { supportBugReportSchema } from '@/lib/support/contracts';
import { isSupportAuthFailure } from '@/lib/support/validation';
import { S } from '../_components/support-design';

export default function BugReportPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState('');
    const [expected, setExpected] = useState('');
    const [actual, setActual] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (sending) return;
        setError(null);
        const parsed = supportBugReportSchema.safeParse({
            subject: title,
            description,
            categoryId: 'technical',
            priority: 'HIGH',
            stepsToReproduce: steps,
            expectedResult: expected,
            actualResult: actual,
            url: typeof window !== 'undefined' ? window.location.href.slice(0, 2000) : undefined,
            browser: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : undefined,
        });
        if (!parsed.success) {
            setError('تحقق من الحقول: العنوان (8+)، الوصف (20+)، وخطوات التكرار (10+).');
            return;
        }
        setSending(true);
        try {
            const ticket = await supportService.createTicket({
                subject: `[بلاغ] ${title.trim()}`,
                description: [
                    description.trim(),
                    '',
                    'خطوات التكرار:',
                    steps.trim(),
                    '',
                    `المتوقع: ${expected.trim()}`,
                    `الفعلي: ${actual.trim()}`,
                ].join('\n'),
                categoryId: 'technical',
                priority: 'HIGH',
            });
            router.push(`/support/tickets/${encodeURIComponent(ticket.id)}`);
        } catch (err) {
            setError(isSupportAuthFailure(err) ? 'يجب تسجيل الدخول أولاً للإبلاغ عن مشكلة.' : 'تعذّر إرسال البلاغ. حاول مجدداً.');
        } finally {
            setSending(false);
        }
    }

    return (
        <div className={S.page} dir="rtl">
            <div className={S.formWrap}>
                <section className={S.section}>
                    <h1 className={S.sectionTitle}>الإبلاغ عن مشكلة</h1>
                    <p className={S.sectionSub}>
                        صف الخلل بدقة وسنحوّله لتذكرة دعم فنية تُتابع من{' '}
                        <Link href="/support/tickets" className="font-bold text-[#0F766E] dark:text-orange-500">صفحة تذاكري</Link>.
                    </p>
                    <form onSubmit={onSubmit} className={`${S.card} mt-6 p-5 sm:p-6 space-y-5`}>
                        <div>
                            <label htmlFor="b-title" className={S.label}>عنوان المشكلة</label>
                            <input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} className={S.input} maxLength={200} required />
                        </div>
                        <div>
                            <label htmlFor="b-desc" className={S.label}>وصف المشكلة</label>
                            <textarea id="b-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${S.input} resize-none`} maxLength={20000} required />
                        </div>
                        <div>
                            <label htmlFor="b-steps" className={S.label}>خطوات التكرار</label>
                            <textarea id="b-steps" value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} placeholder={'1. …\n2. …\n3. …'} className={`${S.input} resize-none`} maxLength={10000} required />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="b-expected" className={S.label}>السلوك المتوقع</label>
                                <textarea id="b-expected" value={expected} onChange={(e) => setExpected(e.target.value)} rows={3} className={`${S.input} resize-none`} maxLength={5000} required />
                            </div>
                            <div>
                                <label htmlFor="b-actual" className={S.label}>السلوك الفعلي</label>
                                <textarea id="b-actual" value={actual} onChange={(e) => setActual(e.target.value)} rows={3} className={`${S.input} resize-none`} maxLength={5000} required />
                            </div>
                        </div>
                        <p className={S.helper}>سيُرفق تلقائياً: الصفحة الحالية ونوع المتصفح لمساعدتنا على التشخيص.</p>
                        {error && <p className={S.alertError} role="alert">{error} {error.includes('تسجيل الدخول') && <Link href="/login" className="font-bold underline">تسجيل الدخول</Link>}</p>}
                        <button type="submit" disabled={sending} className={S.btnPrimaryLarge}>
                            {sending ? 'جارٍ الإرسال…' : 'إرسال البلاغ'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}

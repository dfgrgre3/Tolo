'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supportService, type SupportArticleSummary } from '@/services/api/support-service';
import { supportTicketSchema } from '@/lib/support/contracts';
import { S } from '../../_components/support-design';

const CATEGORIES = [
    { value: 'technical', label: 'مشكلة تقنية' },
    { value: 'billing', label: 'الدفع والفواتير' },
    { value: 'content', label: 'محتوى تعليمي' },
    { value: 'account', label: 'الحساب' },
    { value: 'other', label: 'أخرى' },
];

const PRIORITIES = [
    { value: 'low', label: 'منخفضة' },
    { value: 'medium', label: 'متوسطة' },
    { value: 'high', label: 'عالية' },
    { value: 'urgent', label: 'عاجلة' },
];

export default function NewTicketPage() {
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('technical');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [fieldErrors, setFieldErrors] = useState<string[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [suggestions, setSuggestions] = useState<SupportArticleSummary[]>([]);

    // Real retrieval assistance: as the subject is typed, surface matching
    // knowledge-base articles so the issue may resolve without a ticket.
    useEffect(() => {
        const q = subject.trim();
        if (q.length < 4) return;
        let cancelled = false;
        const t = setTimeout(() => {
            (async () => {
                try {
                    const res = await supportService.listArticles({ search: q, limit: 3 });
                    if (!cancelled) setSuggestions(res.data);
                } catch {
                    if (!cancelled) setSuggestions([]);
                }
            })();
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [subject]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (sending) return;
        setFieldErrors([]);
        setSubmitError(null);
        const parsed = supportTicketSchema.safeParse({
            subject,
            description,
            categoryId: category,
            priority: priority.toUpperCase(),
        });
        if (!parsed.success) {
            setFieldErrors(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
            return;
        }
        setSending(true);
        try {
            const ticket = await supportService.createTicket({
                subject: subject.trim(),
                description: description.trim(),
                categoryId: category,
                priority: priority.toUpperCase(),
            });
            router.push(`/support/tickets/${encodeURIComponent(ticket.id)}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            setSubmitError(msg.includes('401') ? 'يجب تسجيل الدخول أولاً لفتح تذكرة.' : 'تعذّر إنشاء التذكرة. حاول مجدداً.');
        } finally {
            setSending(false);
        }
    }

    return (
        <div className={S.page} dir="rtl">
            <div className={S.formWrap}>
                <section className={S.section}>
                    <h1 className={S.sectionTitle}>فتح تذكرة دعم</h1>
                    <p className={S.sectionSub}>
                        اشرح مشكلتك بوضوح وسيرد عليك فريق الدعم. يمكنك متابعة الردود من{' '}
                        <Link href="/support/tickets" className="font-bold text-[#0F766E] dark:text-orange-500">صفحة تذاكري</Link>.
                    </p>
                    <form onSubmit={onSubmit} className={`${S.card} mt-6 p-5 sm:p-6 space-y-5`}>
                        <div>
                            <label htmlFor="t-subject" className={S.label}>الموضوع</label>
                            <input id="t-subject" value={subject} onChange={(e) => { setSubject(e.target.value); if (e.target.value.trim().length < 4) setSuggestions([]); }} placeholder="مثال: لا أستطيع تشغيل فيديو الدرس" className={S.input} maxLength={200} required />
                        </div>
                        {suggestions.length > 0 && (
                            <div className="rounded-[8px] border border-[#0F766E]/30 bg-[#0F766E]/5 dark:bg-orange-500/5 dark:border-orange-500/30 p-4" aria-live="polite">
                                <p className="text-sm font-black">هل تساعدك هذه المقالات؟</p>
                                <ul className="mt-2 space-y-2">
                                    {suggestions.map((a) => (
                                        <li key={a.slug}>
                                            <Link
                                                href={`/support/articles/${encodeURIComponent(a.slug)}`}
                                                className="block text-sm font-bold text-[#0F766E] dark:text-orange-500 hover:underline"
                                            >
                                                {a.titleAr}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="t-category" className={S.label}>الفئة</label>
                                <select id="t-category" value={category} onChange={(e) => setCategory(e.target.value)} className={S.input}>
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="t-priority" className={S.label}>الأولوية</label>
                                <select id="t-priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={S.input}>
                                    {PRIORITIES.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="t-description" className={S.label}>وصف المشكلة (20 حرفاً على الأقل)</label>
                            <textarea id="t-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="اشرح ما حدث، ومتى، وعلى أي صفحة أو درس…" className={`${S.input} resize-none`} maxLength={20000} required />
                        </div>
                        {fieldErrors.length > 0 && (
                            <ul className={S.alertError} role="alert">
                                {fieldErrors.map((f) => (
                                    <li key={f}>{f}</li>
                                ))}
                            </ul>
                        )}
                        {submitError && (
                            <p className={S.alertError} role="alert">
                                {submitError}{' '}
                                {submitError.includes('تسجيل الدخول') && (
                                    <Link href="/login" className="font-bold underline">تسجيل الدخول</Link>
                                )}
                            </p>
                        )}
                        <button type="submit" disabled={sending} className={S.btnPrimaryLarge}>
                            {sending ? 'جارٍ الإرسال…' : 'إرسال التذكرة'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}

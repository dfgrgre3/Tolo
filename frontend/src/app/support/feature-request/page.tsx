'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supportService } from '@/services/api/support-service';
import { supportFeatureRequestSchema } from '@/lib/support/contracts';
import { S } from '../_components/support-design';

export default function FeatureRequestPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [useCase, setUseCase] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (sending) return;
        setError(null);
        const parsed = supportFeatureRequestSchema.safeParse({ title, description, useCase });
        if (!parsed.success) {
            setError('تحقق من الحقول: العنوان (8+)، الوصف (20+)، وحالة الاستخدام (10+).');
            return;
        }
        setSending(true);
        try {
            const ticket = await supportService.createTicket({
                subject: `[اقتراح] ${title.trim()}`,
                description: `${description.trim()}\n\nحالة الاستخدام:\n${useCase.trim()}`,
                categoryId: 'other',
                priority: 'LOW',
            });
            router.push(`/support/tickets/${encodeURIComponent(ticket.id)}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            setError(msg.includes('401') ? 'يجب تسجيل الدخول أولاً لاقتراح ميزة.' : 'تعذّر إرسال الاقتراح. حاول مجدداً.');
        } finally {
            setSending(false);
        }
    }

    return (
        <div className={S.page} dir="rtl">
            <div className={S.formWrap}>
                <section className={S.section}>
                    <h1 className={S.sectionTitle}>اقتراح ميزة</h1>
                    <p className={S.sectionSub}>
                        أفكارك تشكّل مستقبل المنصة. سيُتابع اقتراحك كطلب دعم من{' '}
                        <Link href="/support/tickets" className="font-bold text-[#0F766E] dark:text-orange-500">صفحة تذاكري</Link>.
                    </p>
                    <form onSubmit={onSubmit} className={`${S.card} mt-6 p-5 sm:p-6 space-y-5`}>
                        <div>
                            <label htmlFor="f-title" className={S.label}>عنوان الميزة</label>
                            <input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} className={S.input} maxLength={200} required />
                        </div>
                        <div>
                            <label htmlFor="f-desc" className={S.label}>وصف الميزة</label>
                            <textarea id="f-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={`${S.input} resize-none`} maxLength={20000} required />
                        </div>
                        <div>
                            <label htmlFor="f-usecase" className={S.label}>كيف ستستخدمها؟ (حالة الاستخدام)</label>
                            <textarea id="f-usecase" value={useCase} onChange={(e) => setUseCase(e.target.value)} rows={4} className={`${S.input} resize-none`} maxLength={10000} required />
                        </div>
                        {error && <p className={S.alertError} role="alert">{error} {error.includes('تسجيل الدخول') && <Link href="/login" className="font-bold underline">تسجيل الدخول</Link>}</p>}
                        <button type="submit" disabled={sending} className={S.btnPrimaryLarge}>
                            {sending ? 'جارٍ الإرسال…' : 'إرسال الاقتراح'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@thanawy/shared/site-config';
import { S } from '../_components/support-design';
import { FaqClient } from '../_components/faq-client';

export const metadata: Metadata = {
    title: `الأسئلة الشائعة | ${SITE.name}`,
    description: 'إجابات الأسئلة الشائعة حول الحساب والدورات والاشتراكات والدعم.',
};

export default function SupportFaqPage() {
    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <div className="text-center mb-8">
                        <h1 className={S.sectionTitle}>الأسئلة الشائعة</h1>
                        <p className={`${S.sectionSub} max-w-2xl mx-auto`}>
                            إجابات مُدارة من فريق الدعم. لم تجد إجابتك؟{' '}
                            <Link href="/support/tickets/new" className="font-bold text-[#0F766E] dark:text-orange-500">افتح تذكرة دعم</Link>.
                        </p>
                    </div>
                    <FaqClient />
                </section>
            </div>
        </div>
    );
}

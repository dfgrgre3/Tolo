import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { SITE } from '@thanawy/shared/site-config';
import { toSafeJsonLd } from '@/lib/security/json-ld';
import { loadSupportFaqs } from '@/lib/support/support-server';
import { S } from '../_components/support-design';
import { FaqClient } from '../_components/faq-client';

export const metadata: Metadata = {
    title: `الأسئلة الشائعة | ${SITE.name}`,
    description: 'إجابات الأسئلة الشائعة حول الحساب والدورات والاشتراكات والدعم.',
    alternates: { canonical: `${SITE.url}/support/faq` },
};

/**
 * Managed FAQ list — rendered on the server so the answers are indexable and
 * visible on first paint, with the client query left in charge of refresh.
 * FAQPage structured data is emitted only for entries that were actually
 * server-rendered (never for content a crawler cannot see).
 */
export default async function SupportFaqPage() {
    const [faqs, nonce] = await Promise.all([
        loadSupportFaqs(),
        headers().then((store) => store.get('x-nonce') ?? undefined),
    ]);

    const faqSchema = faqs && faqs.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
        }
        : null;

    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    {faqSchema && (
                        <script
                            type="application/ld+json"
                            nonce={nonce}
                            dangerouslySetInnerHTML={{ __html: toSafeJsonLd(faqSchema) }}
                        />
                    )}
                    <div className="text-center mb-8">
                        <h1 className={S.sectionTitle}>الأسئلة الشائعة</h1>
                        <p className={`${S.sectionSub} max-w-2xl mx-auto`}>
                            إجابات مُدارة من فريق الدعم. لم تجد إجابتك؟{' '}
                            <Link href="/support/tickets/new" className="font-bold text-[#0F766E] dark:text-orange-500">افتح تذكرة دعم</Link>.
                        </p>
                    </div>
                    <FaqClient initialFaqs={faqs} />
                </section>
            </div>
        </div>
    );
}

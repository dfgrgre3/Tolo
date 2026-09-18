import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';
import { S } from '../../_components/support-design';
import { ArticleDetail } from './_detail';

export const metadata: Metadata = {
    title: `مقالات المساعدة | ${SITE.name}`,
    description: `مقالات وشروحات المساعدة في ${SITE.name}.`,
};

export default async function SupportArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <ArticleDetail slug={slug} />
                </section>
            </div>
        </div>
    );
}

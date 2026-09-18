import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';
import { S } from '../_components/support-design';
import { StatusClient } from '../_components/status-client';

export const metadata: Metadata = {
    title: `حالة النظام | ${SITE.name}`,
    description: 'الحالة التشغيلية لخدمات المنصة وسجل الأعطال.',
};

export default function SupportStatusPage() {
    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <h1 className={S.sectionTitle}>حالة النظام</h1>
                    <p className={S.sectionSub}>الحالة التشغيلية لخدمات المنصة وسجل الأعطال</p>
                    <div className="mt-6">
                        <StatusClient />
                    </div>
                </section>
            </div>
        </div>
    );
}

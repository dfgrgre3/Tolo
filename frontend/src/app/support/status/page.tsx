import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';
import { loadSupportIncidents, loadSupportStatus } from '@/lib/support/support-server';
import { S } from '../_components/support-design';
import { StatusClient } from '../_components/status-client';

export const metadata: Metadata = {
    title: `حالة النظام | ${SITE.name}`,
    description: 'الحالة التشغيلية لخدمات المنصة وسجل الأعطال.',
    alternates: { canonical: `${SITE.url}/support/status` },
};

/**
 * Operational status page: server-rendered (so the current state is visible
 * immediately, even before hydration) and then kept fresh by the client
 * queries while the tab stays open.
 */
export default async function SupportStatusPage() {
    const [status, incidents] = await Promise.all([
        loadSupportStatus(),
        loadSupportIncidents(),
    ]);

    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <h1 className={S.sectionTitle}>حالة النظام</h1>
                    <p className={S.sectionSub}>الحالة التشغيلية لخدمات المنصة وسجل الأعطال</p>
                    <div className="mt-6">
                        <StatusClient initialStatus={status} initialIncidents={incidents} />
                    </div>
                </section>
            </div>
        </div>
    );
}

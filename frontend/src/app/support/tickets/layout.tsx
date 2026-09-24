import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';

/**
 * Account-scoped support area: metadata for the client-rendered ticket routes
 * and `noindex` so private request pages never enter a search index.
 */
export const metadata: Metadata = {
    title: `تذاكري | ${SITE.name}`,
    description: 'تابع طلبات الدعم الخاصة بك وردود فريق الدعم.',
    robots: { index: false, follow: false },
};

export default function SupportTicketsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

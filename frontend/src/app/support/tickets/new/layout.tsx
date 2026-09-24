import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';

export const metadata: Metadata = {
    title: `فتح تذكرة دعم | ${SITE.name}`,
    description: 'اشرح مشكلتك لفريق الدعم وتابع الردود من صفحة تذاكري.',
    robots: { index: false, follow: false },
};

export default function NewTicketLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

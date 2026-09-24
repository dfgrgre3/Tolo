import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';

export const metadata: Metadata = {
    title: `تفاصيل التذكرة | ${SITE.name}`,
    description: 'محادثة تذكرة الدعم، حالتها، وتقييم الخدمة.',
    robots: { index: false, follow: false },
};

export default function TicketDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

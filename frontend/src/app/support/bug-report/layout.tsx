import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';

export const metadata: Metadata = {
    title: `الإبلاغ عن مشكلة | ${SITE.name}`,
    description: 'أبلغ فريق الدعم عن خلل تقني مع خطوات التكرار والسلوك المتوقع.',
    alternates: { canonical: `${SITE.url}/support/bug-report` },
};

export default function BugReportLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

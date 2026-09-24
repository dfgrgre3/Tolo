import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';

export const metadata: Metadata = {
    title: `اقتراح ميزة | ${SITE.name}`,
    description: 'شاركنا أفكارك لتحسين المنصة وسيتابع فريق الدعم اقتراحك.',
    alternates: { canonical: `${SITE.url}/support/feature-request` },
};

export default function FeatureRequestLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

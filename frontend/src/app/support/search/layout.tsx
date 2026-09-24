import type { Metadata } from 'next';
import { SITE } from '@thanawy/shared/site-config';

/**
 * The search page is a client component (it owns the live query state), so its
 * metadata is declared here. Result pages stay out of the index: they must not
 * compete with the canonical article / FAQ URLs they surface.
 */
export const metadata: Metadata = {
    title: `البحث في المساعدة | ${SITE.name}`,
    description: `ابحث في مقالات المساعدة والأسئلة الشائعة في ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/support/search` },
    robots: { index: false, follow: true },
};

export default function SupportSearchLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

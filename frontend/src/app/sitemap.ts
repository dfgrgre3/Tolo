import { type MetadataRoute } from 'next';
import { SITE } from '@thanawy/shared/site-config';
import {
  mainNavItemsWithMegaMenu,
  headerNavItems,
} from '@/components/mega-menu/navData';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE.url;

  // ── Mega-menu deep links ──────────────────────────────────────────
  // MegaMenu content (schools stages/grades, courses sub-categories, …) is
  // rendered client-side only via a React portal, so its links never appear
  // in the initial SSR HTML for crawlers/no-JS clients. We pull the same
  // navData.tsx source of truth used by the header here so those routes stay
  // crawlable without duplicating URLs in two places.
  const megaMenuRoutes = [...mainNavItemsWithMegaMenu, ...headerNavItems].flatMap((navItem) =>
    (navItem.megaMenu ?? []).flatMap((category) =>
      category.items
        .filter((item) => item.href.startsWith('/')) // skip any external links
        .map((item) => ({
          url: `${baseUrl}${item.href}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }))
    )
  );

  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 1.0 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/forgot-password`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/courses`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/teachers`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/announcements`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/library`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/resources`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/contests`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/tips`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  // De-duplicate in case a URL appears both as a static route and inside a mega-menu category.
  const seen = new Set(staticRoutes.map((route) => route.url));
  const uniqueMegaMenuRoutes = megaMenuRoutes.filter((route) => {
    if (seen.has(route.url)) return false;
    seen.add(route.url);
    return true;
  });

  return [...staticRoutes, ...uniqueMegaMenuRoutes];
}

import { type MetadataRoute } from 'next';
import { SITE } from '@thanawy/shared/site-config';
import {
  mainNavItemsWithMegaMenu,
  headerNavItems,
} from '@/components/mega-menu/navData';
import { fetchCatalogPageRaw } from '@/features/courses/api/courses-gateway';
import { readCatalogPayload } from '@/app/(education)/courses/catalog-data';

// Google caps a single sitemap file at 50,000 URLs. generateSitemaps splits the
// catalog across /sitemap.xml, /sitemap-1.xml, … so the sitemap keeps working
// as the catalog grows past that cap.
const SITEMAP_URL_CAP = 50_000;
const CATALOG_PAGE_SIZE = 100;
// Bounds the work a single sitemap render does even on a very large catalog.
const MAX_CATALOG_PAGES = 2_000; // 200k courses at 100/page

type CatalogItem = { slug?: string | null; id?: string; updatedAt?: string };

/**
 * Fetch every published course the public catalog exposes, page by page. Only
 * published rows ever reach this list (the catalog API enforces it), so a
 * draft/private course can never land in the sitemap. Any API failure degrades
 * to "no course URLs" rather than breaking the whole sitemap.
 */
async function fetchPublishedCourses(): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  for (let page = 1; page <= MAX_CATALOG_PAGES; page++) {
    let payload: unknown;
    try {
      payload = await fetchCatalogPageRaw(CATALOG_PAGE_SIZE, page);
    } catch {
      break;
    }
    const pageItems = readCatalogPayload(payload).courses as CatalogItem[];
    if (pageItems.length === 0) {
      break;
    }
    items.push(...pageItems);
    if (pageItems.length < CATALOG_PAGE_SIZE) {
      break;
    }
  }
  return items;
}

function toCourseUrl(baseUrl: string, course: CatalogItem) {
  // A missing slug (a legacy row predating NOT NULL) falls back to the id; the
  // [slug] route 301-redirects that to the canonical slug on request.
  const segment = course.slug?.trim() || course.id;
  if (!segment) return null;
  return {
    url: `${baseUrl}/courses/${encodeURIComponent(segment)}`,
    lastModified: course.updatedAt ? new Date(course.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  };
}

// ── Mega-menu deep links ──────────────────────────────────────────
// MegaMenu content (schools stages/grades, courses sub-categories, …) is
// rendered client-side only via a React portal, so its links never appear
// in the initial SSR HTML for crawlers/no-JS clients. We pull the same
// navData.tsx source of truth used by the header here so those routes stay
// crawlable without duplicating URLs in two places.
function megaMenuRoutes(baseUrl: string): MetadataRoute.Sitemap {
  return [...mainNavItemsWithMegaMenu, ...headerNavItems].flatMap((navItem) =>
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
}

function staticRoutes(baseUrl: string): MetadataRoute.Sitemap {
  return [
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
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
  ];
}

// One sitemap file per slice of the catalog; the static + mega-menu routes live
// in the first file only.
export async function generateSitemaps() {
  const published = await fetchPublishedCourses();
  const files = Math.max(1, Math.ceil(published.length / SITEMAP_URL_CAP));
  return Array.from({ length: files }, (_, index) => ({ id: index }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE.url;

  if (id !== 0) {
    const published = await fetchPublishedCourses();
    return published
      .slice(id * SITEMAP_URL_CAP, (id + 1) * SITEMAP_URL_CAP)
      .map((course) => toCourseUrl(baseUrl, course))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  const baseRoutes = [...staticRoutes(baseUrl), ...megaMenuRoutes(baseUrl)];

  // De-duplicate in case a URL appears both as a static route and inside a
  // mega-menu category. First occurrence wins.
  const seen = new Set<string>();
  const uniqueBaseRoutes = baseRoutes.filter((route) => {
    if (seen.has(route.url)) return false;
    seen.add(route.url);
    return true;
  });

  const published = await fetchPublishedCourses();
  const courseRoutes = published
    .slice(0, SITEMAP_URL_CAP)
    .map((course) => toCourseUrl(baseUrl, course))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .filter((entry) => {
      if (seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    });

  return [...uniqueBaseRoutes, ...courseRoutes];
}

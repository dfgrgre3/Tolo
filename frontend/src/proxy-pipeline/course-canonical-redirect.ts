import { NextResponse, type NextRequest } from 'next/server';
import { getBackendApiUrl } from '@thanawy/shared/backend-url';

/**
 * Legacy /courses/<uuid> links still circulate in search indexes, shares and
 * bookmarks. Canonicalize them to the slug URL with a real 301 so there is a
 * single durable address per course and no duplicate-content signal between
 * the id and slug forms. Only UUID-shaped segments trigger a backend lookup;
 * slug URLs cost this pipeline one regex.
 *
 * Returns null when no canonicalization applies, so the caller falls through
 * to the normal render path (a UUID that resolves to a slug-less course, or a
 * UUID the backend does not know, is served as-is and the page 404s).
 */

const COURSES_PREFIX = '/courses/';
// UUID v1–v5, case-insensitive.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractLegacyCourseSegment(pathname: string): string | null {
  if (!pathname.startsWith(COURSES_PREFIX)) return null;
  const rest = pathname.slice(COURSES_PREFIX.length);
  const segment = rest.split('/')[0];
  if (!segment || !UUID_RE.test(segment)) return null;
  return segment;
}

export async function canonicalizeCourseUrl(
  request: NextRequest,
): Promise<NextResponse | null> {
  const legacyId = extractLegacyCourseSegment(request.nextUrl.pathname);
  if (!legacyId) return null;

  let slug: string | undefined;
  try {
    // The hydration endpoint resolves both id and slug; the response carries
    // the canonical slug under subject.slug. This runs in the edge middleware,
    // before a request context exists, so it calls the backend directly the
    // same way lib/auth/jwt-edge.ts does rather than through apiClient.
    const response = await globalThis.fetch(
      getBackendApiUrl(`/courses/${legacyId}/detail`),
      {
        // A legacy canonicalization must never block the page longer than the
        // render itself would; a slow lookup falls through to normal rendering.
        signal: AbortSignal.timeout(4_000),
        cache: 'no-store',
      },
    );
    if (response.ok) {
      const payload = (await response.json()) as {
        data?: { subject?: { slug?: string | null } };
        subject?: { slug?: string | null };
      };
      slug = payload.data?.subject?.slug ?? payload.subject?.slug ?? undefined;
    }
  } catch {
    return null;
  }

  if (!slug || slug.trim() === '' || slug.trim() === legacyId) {
    return null;
  }

  const url = new URL(request.url);
  url.pathname = url.pathname.replace(legacyId, slug.trim());
  // 301 (not 308): the brief requires permanent canonicalization of the old
  // slug/id address, and crawlers transfer link equity on this exact status.
  return NextResponse.redirect(url, 301);
}

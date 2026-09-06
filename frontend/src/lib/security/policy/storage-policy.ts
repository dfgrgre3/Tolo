export const PUBLIC_STORAGE_BUCKETS = new Set(['public-assets', 'avatars']);
export const FORWARDED_COOKIE_NAMES = new Set(['access_token', 'refresh_token', '__session', '_csrf']);

export function isPublicStorageBucket(bucket: string | undefined): bucket is string {
  return !!bucket && PUBLIC_STORAGE_BUCKETS.has(bucket);
}

export function hasUnsafeStorageSegment(segments: string[]): boolean {
  return segments.some(
    (segment) => segment === '' || segment === '.' || segment === '..' || segment.includes('\\'),
  );
}

export function decodeStorageSegments(segments: string[]): string[] | null {
  try {
    const decoded = segments.map((segment) => decodeURIComponent(segment));
    if (decoded.some((segment) => segment.includes('/') || segment.includes('\\') || segment.includes('\0'))) {
      return null;
    }
    return hasUnsafeStorageSegment(decoded) ? null : decoded;
  } catch {
    return null;
  }
}

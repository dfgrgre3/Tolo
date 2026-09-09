// Client-side upload policy aligned with the backend upload contract.
// Client-submitted restrictions can only narrow these limits, never widen them.

export const MAX_SIMPLE_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB hard cap for simple / direct uploads
export const SERVER_MAX_FILE_SIZE = MAX_SIMPLE_UPLOAD_SIZE; // Backwards compatibility alias

export const MAX_CHUNKED_UPLOAD_SIZE = 500 * 1024 * 1024; // 500 MB hard cap for chunked uploads
export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
export const MAX_CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB max per chunk

// Master MIME allowlist enforced regardless of what the client sends.
// text/html and application/xhtml+xml are intentionally excluded
// (phishing/hosted-attack-page vector on a trusted domain).
export const SERVER_ALLOWED_TYPES = [
  "image/*",
  "video/*",
  "audio/*",
  "font/*",
  "application/pdf",
  "application/json",
  "application/zip",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

/** Wildcard-aware allowlist check (empty/unknown MIME types are rejected). */
export function isFileTypeAllowed(mimeType: string): boolean {
  if (!mimeType) return false;
  return SERVER_ALLOWED_TYPES.some((allowed) =>
    allowed.endsWith("/*")
      ? mimeType.startsWith(allowed.slice(0, -1))
      : mimeType === allowed
  );
}

/**
 * Validate a file's leading bytes against its declared content type.
 * Client MIME metadata is advisory; these checks provide a server-side
 * signature check for the binary formats accepted by the upload routes.
 * Text formats are validated separately by their parsers/sanitizers.
 */
export function hasValidContentSignature(
  bytes: Uint8Array,
  mimeType: string,
): boolean {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  const asciiAt = (offset: number, value: string) =>
    value.split('').every((character, index) => bytes[offset + index] === character.charCodeAt(0));

  if (mimeType === 'application/pdf') return asciiAt(0, '%PDF-');
  if (mimeType === 'application/zip') return startsWith(0x50, 0x4b, 0x03, 0x04) || startsWith(0x50, 0x4b, 0x05, 0x06);
  if (mimeType === 'image/png') return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mimeType === 'image/jpeg') return startsWith(0xff, 0xd8, 0xff);
  if (mimeType === 'image/gif') return asciiAt(0, 'GIF87a') || asciiAt(0, 'GIF89a');
  if (mimeType === 'image/webp') return asciiAt(0, 'RIFF') && asciiAt(8, 'WEBP');
  if (mimeType === 'audio/mpeg') return asciiAt(0, 'ID3') || (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0);
  if (mimeType === 'audio/wav') return asciiAt(0, 'RIFF') && asciiAt(8, 'WAVE');
  if (mimeType === 'audio/ogg' || mimeType === 'video/ogg') return asciiAt(0, 'OggS');
  if (mimeType === 'video/mp4') return asciiAt(4, 'ftyp');
  if (mimeType === 'font/woff') return asciiAt(0, 'wOFF');
  if (mimeType === 'font/woff2') return asciiAt(0, 'wOF2');
  if (mimeType === 'font/ttf' || mimeType === 'font/otf') return asciiAt(0, 'OTTO') || startsWith(0x00, 0x01, 0x00, 0x00);

  // JSON, CSV, Markdown, and plain text have no reliable magic number.
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    return !bytes.includes(0);
  }

  // SVG is validated by sanitizeSvg before storage.
  return mimeType === 'image/svg+xml';
}

/** Folder becomes part of the storage key — reduce it to a single safe segment. */
export function sanitizeFolder(folder: string): string {
  const cleaned = folder.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "uploads";
}

// =============================================================================
// Bucket visibility policy
// =============================================================================
//
// The platform mixes genuinely public assets (avatars, blog cover images,
// marketing copy, course thumbnails shared with anonymous visitors) with
// strictly private content (student submissions, certificates, invoices,
// teacher-only materials). Every storage consumer MUST consult this map to
// decide whether to:
//   - issue a short-lived signed URL (private buckets), or
//   - return a public CDN URL (only the buckets listed here).
//
// Adding a bucket to PUBLIC_BUCKETS is a security-relevant decision: every
// object placed under it becomes world-readable at the CDN edge.
export const PUBLIC_BUCKETS: ReadonlySet<string> = new Set([
  "public-assets",
  "avatars",
]);

/** True only when the bucket is explicitly listed as public. Default: false. */
export function isPublicBucket(bucket: string): boolean {
  if (!bucket) return false;
  return PUBLIC_BUCKETS.has(bucket);
}

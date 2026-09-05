// Server-enforced upload policy shared by /api/storage/upload and
// /api/storage/chunked-upload. Client-submitted restrictions can only
// NARROW these limits, never widen them.

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

/** Folder becomes part of the storage key — reduce it to a single safe segment. */
export function sanitizeFolder(folder: string): string {
  const cleaned = folder.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "uploads";
}

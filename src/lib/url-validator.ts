/**
 * URL Validation Utility
 * Validates URLs to prevent open redirect and XSS vulnerabilities
 */

/**
 * Validates if a URL is safe for navigation
 * @param url - The URL to validate
 * @returns true if the URL is safe, false otherwise
 */
export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Empty URLs are not safe
  if (trimmedUrl.length === 0) {
    return false;
  }

  try {
    // Check for dangerous protocols
    const dangerousProtocols = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'about:',
    ];

    const lowerUrl = trimmedUrl.toLowerCase();
    
    // Block dangerous protocols
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return false;
      }
    }

    // If it's a relative URL (starts with / or ./ or ../), it's safe
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
      return true;
    }

    // For absolute URLs, validate using URL constructor
    const urlObj = new URL(trimmedUrl);

    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }

    // Optional: Restrict to same origin only
    // Uncomment the following lines if you want to only allow same-origin URLs
    // if (typeof window !== 'undefined') {
    //   const currentOrigin = window.location.origin;
    //   if (urlObj.origin !== currentOrigin) {
    //     return false;
    //   }
    // }

    return true;
  } catch (error) {
    // If URL parsing fails, treat as relative URL
    // Only allow if it starts with / (relative path)
    return trimmedUrl.startsWith('/');
  }
}

/**
 * Sanitizes a URL for safe navigation
 * @param url - The URL to sanitize
 * @param fallback - Fallback URL if the input is unsafe (default: '/')
 * @returns A safe URL or the fallback
 */
export function sanitizeUrl(url: string | undefined | null, fallback: string = '/'): string {
  return isSafeUrl(url) ? url!.trim() : fallback;
}

/**
 * Safely navigates to a URL after validation
 * @param url - The URL to navigate to
 * @param fallback - Fallback URL if the input is unsafe (default: '/')
 */
export function safeNavigate(url: string | undefined | null, fallback: string = '/'): void {
  const safeUrl = sanitizeUrl(url, fallback);
  if (typeof window !== 'undefined') {
    window.location.href = safeUrl;
  }
}

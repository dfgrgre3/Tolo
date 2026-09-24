/**
 * Help Center — validation & normalization primitives (pure; server- and
 * client-safe, no data fetching).
 *
 * Why this exists:
 *  - SECURITY: slugs and ticket ids are validated BEFORE any request is built,
 *    so traversal-shaped or junk input can never reach the backend as a path
 *    segment (`routes.ts` additionally `encodeURIComponent`s every segment).
 *  - SECURITY/DoS: free text (search boxes, ticket-subject suggestions) is
 *    normalized and hard-capped, so a crafted `?q=` cannot push unbounded or
 *    control-character payloads into the query string, the DOM, or the
 *    backend query parser.
 *  - CORRECTNESS: authentication failures are detected through the shared
 *    error taxonomy (`statusCode === 401`) instead of fragile
 *    `message.includes('401')` matching, which silently breaks the moment the
 *    backend changes its wording.
 */

import { isAppError, isAuthError } from '@/lib/errors/domain-errors';

/** Hard cap for free-text help-center search input (query string + UI). */
export const SUPPORT_SEARCH_MAX_LENGTH = 100;
/** Hard cap for article slugs. */
export const SUPPORT_SLUG_MAX_LENGTH = 200;
/** Hard cap for ticket ids (matches `supportRatingSchema` in contracts.ts). */
export const SUPPORT_ID_MAX_LENGTH = 100;

/** C0 controls end here (NUL, CR/LF, …). */
const C0_CONTROLS_END = 0x1f;
/** C1 controls start here (DEL and the C1 block). */
const C1_CONTROLS_START = 0x7f;
const C1_CONTROLS_END = 0x9f;

/**
 * Replaces C0/C1 control characters (including NUL, CR/LF and DEL) with spaces.
 *
 * Implemented with a code-point comparison rather than a character-class regex:
 * control characters inside a regex are flagged by `no-control-regex`
 * project-wide (and can only be silenced with an inline disable), while an
 * explicit range check keeps the sanitizer's contract obvious and also covers
 * the C1 block. Iterating with `for…of` walks code points, so surrogate pairs
 * (emoji) are never split.
 */
function stripControlCharacters(value: string): string {
    let cleaned = '';
    for (const character of value) {
        const code = character.codePointAt(0) ?? 0;
        const isControl = code <= C0_CONTROLS_END || (code >= C1_CONTROLS_START && code <= C1_CONTROLS_END);
        cleaned += isControl ? ' ' : character;
    }
    return cleaned;
}

/**
 * A URL path segment we are willing to send to the backend: unicode letters,
 * numbers, dot, dash and underscore; must start and end with a letter/number.
 * Arabic slugs are therefore accepted, while `/`, `%`, quotes, spaces and
 * `..` traversal shapes are rejected.
 */
const SEGMENT_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}._-]*[\p{L}\p{N}])?$/u;

function isSafeSegment(value: string, maxLength: number): boolean {
    return (
        value.length > 0 &&
        value.length <= maxLength &&
        !value.includes('..') &&
        SEGMENT_PATTERN.test(value)
    );
}

/** True when `slug` is safe to place in a support article URL. */
export function isValidSupportSlug(slug: string | null | undefined): slug is string {
    return typeof slug === 'string' && isSafeSegment(slug, SUPPORT_SLUG_MAX_LENGTH);
}

/** True when `id` is safe to place in a support ticket URL. */
export function isValidSupportId(id: string | null | undefined): id is string {
    return typeof id === 'string' && isSafeSegment(id, SUPPORT_ID_MAX_LENGTH);
}

/**
 * Normalizes free text: control characters become spaces, whitespace runs are
 * collapsed, the value is trimmed, then capped at `maxLength`.
 */
export function sanitizeSupportText(raw: string | null | undefined, maxLength = SUPPORT_SEARCH_MAX_LENGTH): string {
    if (!raw) return '';
    const normalized = stripControlCharacters(raw)
        .replace(/\s+/g, ' ')
        .trim();
    if (normalized.length <= maxLength) return normalized;
    return normalized.slice(0, maxLength).trim();
}

/** Normalizes a help-center search query (see {@link sanitizeSupportText}). */
export function sanitizeSupportSearchQuery(raw: string | null | undefined): string {
    return sanitizeSupportText(raw, SUPPORT_SEARCH_MAX_LENGTH);
}

/**
 * True for 401 failures raised by the shared API client (`AuthenticationError`
 * or any taxonomy error carrying `statusCode === 401`). Used to switch to the
 * "sign in first" UI instead of retrying a request that cannot succeed.
 */
export function isSupportAuthFailure(error: unknown): boolean {
    return isAuthError(error) || (isAppError(error) && error.statusCode === 401);
}

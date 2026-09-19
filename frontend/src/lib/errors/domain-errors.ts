/**
 * Canonical Application Error Taxonomy (P0-9)
 *
 * Single source of truth for all error classes across the application.
 * Every layer (transport, API client, domain services, UI) must use these
 * classes rather than checking `error.status` or parsing `error.message`.
 *
 * Migration strategy:
 *   - New code: `instanceof AuthenticationError`, `instanceof ValidationError`, etc.
 *   - Legacy code: `instanceof ApiError` still works during the migration window
 *     (ApiError is preserved as a base class for backward-compat). The goal is
 *     to remove ApiError once all call sites are updated.
 *
 * Error hierarchy:
 *   AppError (base)
 *   ├── TransportError       — Network, DNS, TLS, timeout
 *   ├── AuthenticationError  — 401 Unauthenticated
 *   ├── AuthorizationError   — 403 Forbidden
 *   ├── ValidationError      — 400 / 422 + structured field errors
 *   ├── NotFoundError        — 404
 *   ├── ConflictError        — 409
 *   ├── RateLimitError       — 429 + Retry-After
 *   ├── ServerError          — 5xx
 *   └── ContractError        — Envelope / schema violation (was ApiContractError)
 */

/** Base class for all application errors. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode = 'APP_ERROR',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ── Transport ──────────────────────────────────────────────────────────────

/**
 * Network-level failure: DNS, TLS, connection refused, timeout.
 * Safe to retry (idempotent methods) — the request never reached the server.
 */
export class TransportError extends AppError {
  constructor(message = 'Network request failed', options?: ErrorOptions) {
    super(message, 0, 'TRANSPORT_ERROR', options);
  }
}

// ── HTTP Semantic Errors ───────────────────────────────────────────────────

/**
 * 401 — The caller is not authenticated.
 * Usually triggers a redirect to /login.
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', options?: ErrorOptions) {
    super(message, 401, 'UNAUTHENTICATED', options);
  }
}

/**
 * 403 — The caller is authenticated but lacks permission.
 * Should NOT redirect to login; show an "Access Denied" UI instead.
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied', options?: ErrorOptions) {
    super(message, 403, 'FORBIDDEN', options);
  }
}

/** A single field validation failure returned by the server. */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * 400 / 422 — The request payload failed server-side validation.
 * `fields` contains per-field errors for form-level display.
 */
export class ValidationError extends AppError {
  public readonly fields: FieldError[];

  constructor(
    message = 'Validation failed',
    fields: FieldError[] = [],
    options?: ErrorOptions,
  ) {
    super(message, 422, 'VALIDATION_ERROR', options);
    this.fields = fields;
  }
}

/**
 * 404 — The requested resource does not exist.
 * `resource` optionally identifies what was not found (e.g. 'course', 'lesson').
 */
export class NotFoundError extends AppError {
  public readonly resource?: string;

  constructor(message = 'Resource not found', resource?: string, options?: ErrorOptions) {
    super(message, 404, 'NOT_FOUND', options);
    this.resource = resource;
  }
}

/**
 * 409 — The request conflicts with server state (e.g. duplicate, published lock).
 */
export class ConflictError extends AppError {
  constructor(message = 'Request conflicts with current state', options?: ErrorOptions) {
    super(message, 409, 'CONFLICT', options);
  }
}

/**
 * 429 — Rate limited by the server.
 * `retryAfterMs` is set when the server provides a `Retry-After` header.
 */
export class RateLimitError extends AppError {
  public readonly retryAfterMs?: number;

  constructor(message = 'Too many requests', retryAfterMs?: number, options?: ErrorOptions) {
    super(message, 429, 'RATE_LIMITED', options);
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * 5xx — Internal server error.
 * Transient; safe to retry for idempotent methods.
 */
export class ServerError extends AppError {
  constructor(
    message = 'Internal server error',
    statusCode = 500,
    options?: ErrorOptions,
  ) {
    super(message, statusCode, 'SERVER_ERROR', options);
  }
}

/**
 * The HTTP response succeeded (2xx) but violated the API envelope contract
 * (missing `success: true`, missing `data`, unexpected shape, etc.).
 * Previously `ApiContractError` in `api-client.ts`.
 */
export class ContractError extends AppError {
  public readonly payload: unknown;

  constructor(message = "Invalid contract", payload?: unknown, options?: ErrorOptions) {
    super(message, 502, 'CONTRACT_ERROR', options);
    this.payload = payload;
  }
}

// ── Mapping helper ─────────────────────────────────────────────────────────

/**
 * Maps an HTTP status code + message to the canonical domain error.
 * Used by `api-client.ts#buildApiError` to replace the raw `ApiError` constructor.
 */
export function mapStatusToDomainError(
  status: number,
  message: string,
  code?: string,
  data?: Record<string, unknown>,
): AppError {
  // Extract per-field errors for 422 responses.
  const fields: FieldError[] = Array.isArray(data?.errors)
    ? (data.errors as FieldError[])
    : [];

  // Extract Retry-After from structured data (proxy may have parsed the header).
  const retryAfterMs = typeof data?.retryAfterMs === 'number'
    ? data.retryAfterMs
    : undefined;

  switch (status) {
    case 400:
      return new ValidationError(message, fields);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message, code);
    case 409:
      return new ConflictError(message);
    case 422:
      return new ValidationError(message, fields);
    case 429:
      return new RateLimitError(message, retryAfterMs);
    default:
      if (status >= 500) {
        return new ServerError(message, status);
      }
      // Fallthrough for unexpected 4xx codes.
      return new AppError(message, status, code ?? 'HTTP_ERROR');
  }
}

/**
 * Type-guards — convenience wrappers for common checks.
 */
export const isAuthError = (e: unknown): e is AuthenticationError =>
  e instanceof AuthenticationError;

export const isAuthzError = (e: unknown): e is AuthorizationError =>
  e instanceof AuthorizationError;

export const isValidationError = (e: unknown): e is ValidationError =>
  e instanceof ValidationError;

export const isNotFoundError = (e: unknown): e is NotFoundError =>
  e instanceof NotFoundError;

export const isConflictError = (e: unknown): e is ConflictError =>
  e instanceof ConflictError;

export const isRateLimitError = (e: unknown): e is RateLimitError =>
  e instanceof RateLimitError;

export const isServerError = (e: unknown): e is ServerError =>
  e instanceof ServerError;

export const isTransportError = (e: unknown): e is TransportError =>
  e instanceof TransportError;

export const isContractError = (e: unknown): e is ContractError =>
  e instanceof ContractError;

/** True for any error that originated from this taxonomy. */
export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

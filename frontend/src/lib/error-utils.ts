import { ConnectError, Code } from '@connectrpc/connect';

/**
 * Checks if an error is a critical client-side error (e.g., 400, 401, 403, 404, or equivalent Connect RPC codes)
 * that should not be retried.
 */
export function isCriticalError(error: any): boolean {
  if (!error) return false;

  // 1. Handle Connect RPC Errors
  if (error instanceof ConnectError || (error && typeof error === 'object' && 'code' in error)) {
    const code = error.code;
    const criticalCodes = [
      Code.InvalidArgument,
      Code.Unauthenticated,
      Code.PermissionDenied,
      Code.NotFound,
      Code.AlreadyExists,
      Code.FailedPrecondition,
      Code.Unimplemented,
    ];
    if (criticalCodes.includes(code)) {
      return true;
    }
  }

  // 2. Handle HTTP Errors (with status codes)
  const status = error.status || error.statusCode || (error.response && error.response.status);
  if (typeof status === 'number') {
    const criticalStatuses = [400, 401, 403, 404, 409, 422];
    if (criticalStatuses.includes(status)) {
      return true;
    }
  }

  // 3. Handle messages indicating critical failures
  const message = (error.message || '').toLowerCase();
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not found') ||
    message.includes('invalid argument')
  ) {
    return true;
  }

  return false;
}

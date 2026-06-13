import { ConnectError, Code } from '@connectrpc/connect';

/**
 * Checks if an error is a critical client-side error (e.g., 400, 401, 403, 404, or equivalent Connect RPC codes)
 * that should not be retried.
 */
export function isCriticalError(error: unknown): boolean {
  if (!error) return false;

  // Handle JSON parsing / syntax errors immediately as critical (no point retrying)
  if (error instanceof SyntaxError || (error instanceof Error && error.name === 'SyntaxError')) {
    return true;
  }

  const errObj = error as Record<string, unknown>;

  // 1. Handle Connect RPC Errors
  if (error instanceof ConnectError || (typeof error === 'object' && 'code' in errObj)) {
    const code = errObj.code;
    const criticalCodes = [
      Code.InvalidArgument,
      Code.Unauthenticated,
      Code.PermissionDenied,
      Code.NotFound,
      Code.AlreadyExists,
      Code.FailedPrecondition,
      Code.Unimplemented,
    ];
    if (typeof code === 'number' && criticalCodes.includes(code)) {
      return true;
    }
  }

  // 2. Handle HTTP Errors (with status codes)
  let status: number | undefined;
  if (typeof errObj.status === 'number') {
    status = errObj.status;
  } else if (typeof errObj.statusCode === 'number') {
    status = errObj.statusCode;
  } else if (errObj.response && typeof errObj.response === 'object' && 'status' in errObj.response) {
    const resStatus = (errObj.response as Record<string, unknown>).status;
    if (typeof resStatus === 'number') {
      status = resStatus;
    }
  }

  if (status !== undefined) {
    const criticalStatuses = [400, 401, 403, 404, 409, 422];
    if (criticalStatuses.includes(status)) {
      return true;
    }
  }

  // 3. Handle messages indicating critical failures
  const message = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
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

/**
 * Compatibility wrapper for tests and older imports.
 *
 * The codebase's auth implementation lives under `src/lib/auth/auth-service.ts`.
 * Integration tests expect this module to exist at `@/lib/services/auth-service`.
 *
 * Note: In most test suites this module is replaced via `jest.mock(...)`,
 * so these exports are intentionally lightweight.
 */

export const authService = {
  // Old tests mock this method.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyTokenFromRequest: async (_req: unknown) => ({ isValid: false }),
};

export async function verifyToken(_token: string) {
  return { isValid: false };
}


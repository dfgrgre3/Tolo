/**
 * Dummy Token Service for Go-Backend Migration
 */

export const TokenService = {
  verifyToken: async <T>(token: string): Promise<T | null> => {
    // In the new architecture, tokens should be verified by the Go backend
    // or shared session cookies.
    return null;
  }
};

export type TokenPayload = {
  userId: string;
  role: string;
};

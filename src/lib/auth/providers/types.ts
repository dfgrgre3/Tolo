import { User } from '@prisma/client';

/**
 * Represents the successfully authenticated user data.
 * This is a subset of the main Prisma `User` model to avoid exposing sensitive fields.
 */
export type AuthenticatedUser = Omit<User, 'passwordHash' | 'twoFactorSecret' | 'recoveryCodes' | 'passwordResetToken' | 'passwordResetExpires'>;

/**
 * The result of a successful authentication attempt from a provider.
 */
export interface AuthProviderSuccess {
  status: 'success';
  user: AuthenticatedUser;
  isNewUser?: boolean; // Flag to indicate if the user was just created
}

/**
 * The result of a failed authentication attempt.
 */
export interface AuthProviderError {
  status: 'error';
  code: 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'PROVIDER_ERROR' | 'ACCOUNT_LOCKED' | 'EMAIL_NOT_VERIFIED';
  message: string;
}

/**
 * The result when the next step required is 2FA.
 */
export interface AuthProvider2FARequired {
  status: '2fa_required';
  user: AuthenticatedUser;
}

/**
 * A union of all possible authentication results from a provider.
 */
export type AuthProviderResult = AuthProviderSuccess | AuthProviderError | AuthProvider2FARequired;

/**
 * The interface that all authentication providers must implement.
 * @template T - The type of the credentials object the provider accepts (e.g., { email, password } or { oauthCode }).
 */
export interface AuthenticationProvider<T> {
  /**
   * Authenticates a user using the given credentials.
   * @param credentials - The credentials required by the specific provider.
   * @returns A promise that resolves to an AuthProviderResult.
   */
  authenticate(credentials: T): Promise<AuthProviderResult>;
}

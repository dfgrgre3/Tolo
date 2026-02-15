import { authService, AuthUser } from '@/lib/services/auth-service';
import { validateEmail } from '@/lib/auth/validation';
import {
  AuthenticationProvider,
  AuthProviderResult,
  AuthenticatedUser,
} from './types';

/**
 * Credentials required for the Email/Password authentication provider.
 */
export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

/**
 * Implements the authentication logic for the traditional email and password method.
 */
export class EmailPasswordProvider implements AuthenticationProvider<EmailPasswordCredentials> {

  constructor(private service = authService) { }

  /**
   * Authenticates a user with their email and password.
   * This logic is extracted from the original AuthService.login method.
   * @param credentials - The user's email and password.
   * @returns A promise that resolves to an AuthProviderResult.
   */
  public async authenticate(credentials: EmailPasswordCredentials): Promise<AuthProviderResult> {
    const { email, password } = credentials;

    // 1. Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { status: 'error', code: 'INVALID_CREDENTIALS', message: emailValidation.error || 'البريد الإلكتروني غير صحيح' };
    }
    const normalizedEmail = emailValidation.normalized!;

    // For login, only validate password presence and length limits
    // Password strength requirements (uppercase, special chars, etc.) are only for registration
    if (!password || typeof password !== 'string') {
      return { status: 'error', code: 'INVALID_CREDENTIALS', message: 'كلمة المرور مطلوبة' };
    }
    if (password.length < 8) {
      return { status: 'error', code: 'INVALID_CREDENTIALS', message: 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل' };
    }
    if (password.length > 128) {
      return { status: 'error', code: 'INVALID_CREDENTIALS', message: 'كلمة المرور طويلة جداً' };
    }

    // 2. Find the user
    const user = await this.service.getUserByEmail(normalizedEmail);
    if (!user || !user.passwordHash || user.passwordHash === 'oauth_user') {
      return { status: 'error', code: 'USER_NOT_FOUND', message: 'بيانات تسجيل الدخول غير صحيحة' };
    }

    // 3. Verify email is verified (skip in development for testing)
    if (!user.emailVerified && process.env.NODE_ENV !== 'development') {
      return { status: 'error', code: 'EMAIL_NOT_VERIFIED', message: 'البريد الإلكتروني غير مفعل. يرجى تفعيل حسابك.' };
    }

    // 4. Compare passwords
    const isValidPassword = await this.service.comparePasswords(password, user.passwordHash);
    if (!isValidPassword) {
      // Note: We don't handle rate limiting here. The calling service (LoginService) is responsible for it.
      return { status: 'error', code: 'INVALID_CREDENTIALS', message: 'بيانات تسجيل الدخول غير صحيحة' };
    }

    // 5. Sanitize user object - remove sensitive fields
    const { passwordHash, twoFactorSecret, recoveryCodes, ...sanitizedUser } = user;
    const authenticatedUser: AuthenticatedUser = sanitizedUser;

    // 6. Check if 2FA is required
    if (user.twoFactorEnabled) {
      return {
        status: '2fa_required',
        user: authenticatedUser,
      };
    }

    // 7. Return success
    return {
      status: 'success',
      user: authenticatedUser,
    };
  }
}

// Export an instance for convenience
export const emailPasswordProvider = new EmailPasswordProvider(authService);

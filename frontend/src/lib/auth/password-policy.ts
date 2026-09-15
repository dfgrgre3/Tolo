/** Client-side mirror of the backend password policy for immediate feedback.
 * The backend remains authoritative and validates every password operation.
 */
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "qwerty12", "admin123", "letmein1",
  "welcome1", "password1", "123456789", "1234567890",
]);

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/\d/.test(password)) return "Password must contain a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character.";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "This password is too common.";
  return null;
}

export function isPasswordPolicyValid(password: string): boolean {
  return getPasswordPolicyError(password) === null;
}

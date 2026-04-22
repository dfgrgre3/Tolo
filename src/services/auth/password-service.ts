import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export class PasswordService {
    /**
     * Hashes a plain text password.
     * Uses a high number of salt rounds for better security against brute force attacks.
     */
    static async hash(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    /**
     * Compares a plain text password with a hashed password.
     */
    static async compare(password: string, hashed: string): Promise<boolean> {
        return bcrypt.compare(password, hashed);
    }

    /**
     * Validates password strength securely.
     * Requires: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.
     */
    static isStrong(password: string): boolean {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecial;
    }
}

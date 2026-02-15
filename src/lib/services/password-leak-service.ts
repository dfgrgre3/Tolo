import crypto from 'crypto';

export class PasswordLeakService {
    /**
     * Check if a password has been leaked using k-anonymity (simulated safest approach)
     * In a real production env, this would call HaveIBeenPwned API with the hash prefix.
     * For this implementation, we will simulate the check or use a placeholder 
     * to avoid making external calls if not configured.
     */
    static async checkPasswordLeak(password: string): Promise<boolean> {
        try {
            // 1. Hash the password with SHA-1
            const shasum = crypto.createHash('sha1');
            shasum.update(password);
            const digest = shasum.digest('hex').toUpperCase();

            // 2. Prepare k-anonymity request (first 5 chars)
            const prefix = digest.substring(0, 5);
            const suffix = digest.substring(5);

            // 3. Call HIBP API
            // Fail open (return false) if request fails to avoid blocking legitimate users during network issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn('HIBP API error:', response.status);
                return false;
            }

            const text = await response.text();

            // 4. Check if suffix exists in response
            // Response format: SUFFIX:COUNT
            const lines = text.split('\n');
            const found = lines.some(line => line.trim().startsWith(suffix));

            return found;

        } catch (error) {
            console.error('Password leak check failed:', error);
            return false; // Fail open
        }
    }
}

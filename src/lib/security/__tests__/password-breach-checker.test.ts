/**
 * 🧪 Password Breach Checker Tests
 * 
 * اختبارات وحدة لخدمة التحقق من تسريب كلمات المرور
 */

import {
    PasswordBreachChecker,
    checkPasswordBreach,
    checkPasswordBreachClient
} from '../password-breach-checker';

// Mock fetch
global.fetch = jest.fn();

describe('PasswordBreachChecker', () => {
    const checker = new PasswordBreachChecker();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('SHA-1 Hashing', () => {
        it('should correctly hash passwords', async () => {
            // Mock successful response with no match
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('ABCDEF1234567890:100\nFEDCBA0987654321:50'),
            });

            const result = await checker.checkPassword('unique-password-12345');

            expect(global.fetch).toHaveBeenCalled();
            expect(result.breached).toBe(false);
        });
    });

    describe('Breach Detection', () => {
        it('should detect breached passwords', async () => {
            // "password" hashes to 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
            // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(
                    '1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\n' +
                    'OTHER_HASH:100'
                ),
            });

            const result = await checker.checkPassword('password');

            expect(result.breached).toBe(true);
            expect(result.count).toBe(9545824);
            expect(result.severity).toBe('critical');
        });

        it('should return not breached for unique passwords', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('ABCDEF1234567890:100\nFEDCBA0987654321:50'),
            });

            const result = await checker.checkPassword('my-super-unique-password-xyz-123');

            expect(result.breached).toBe(false);
            expect(result.count).toBeUndefined();
        });

        it('should calculate correct severity levels', async () => {
            const testCases = [
                { count: 150000, expectedSeverity: 'critical' },
                { count: 50000, expectedSeverity: 'high' },
                { count: 500, expectedSeverity: 'medium' },
                { count: 10, expectedSeverity: 'low' },
            ];

            for (const { count, expectedSeverity } of testCases) {
                (global.fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    text: () => Promise.resolve(`1E4C9B93F3F0682250B6CF8331B7EE68FD8:${count}`),
                });

                const result = await checker.checkPassword('password');
                expect(result.severity).toBe(expectedSeverity);
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle rate limiting gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 429,
            });

            const result = await checker.checkPassword('test-password');

            expect(result.breached).toBe(false);
            expect(result.message).toContain('تعذر التحقق');
        });

        it('should handle network errors gracefully', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await checker.checkPassword('test-password');

            expect(result.breached).toBe(false);
            expect(result.message).toContain('تعذر التحقق');
        });

        it('should handle timeout gracefully', async () => {
            (global.fetch as jest.Mock).mockImplementationOnce(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 100)
                )
            );

            const checkerWithShortTimeout = new PasswordBreachChecker({ timeout: 50 });
            const result = await checkerWithShortTimeout.checkPassword('test-password');

            expect(result.breached).toBe(false);
        });
    });

    describe('K-Anonymity', () => {
        it('should only send first 5 characters of hash', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(''),
            });

            await checker.checkPassword('any-password');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringMatching(/^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/),
                expect.any(Object)
            );
        });
    });

    describe('Convenience Functions', () => {
        it('checkPasswordBreach should work correctly', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(''),
            });

            const result = await checkPasswordBreach('test');

            expect(result.breached).toBe(false);
        });
    });
});

describe('PasswordBreachChecker - Message Formatting', () => {
    const checker = new PasswordBreachChecker();

    it('should format message for critical breaches (1M+)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('1E4C9B93F3F0682250B6CF8331B7EE68FD8:1500000'),
        });

        const result = await checker.checkPassword('password');

        expect(result.message).toContain('تحذير خطير');
        expect(result.message).toContain('مليون');
    });

    it('should format message for high breaches (100K+)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('1E4C9B93F3F0682250B6CF8331B7EE68FD8:150000'),
        });

        const result = await checker.checkPassword('password');

        expect(result.message).toContain('تحذير');
    });
});

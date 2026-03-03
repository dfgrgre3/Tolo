/**
 * Unit Tests for Authentication Services
 * 
 * Coverage:
 * - PasswordService: hashing, comparison, strength validation
 * - TokenService: generation (with mocked jose)
 * - AuthService: login (success, failure, user enumeration prevention)
 * - AuthService: registration (duplicate email handling)
 * - AuthService: email verification
 * 
 * Note: jose is mocked globally in tests/setup.ts because it's an ESM module.
 * TokenService tests verify the service layer logic, not jose internals.
 */

// Mock Prisma
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
        },
        session: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            updateMany: jest.fn(),
            findMany: jest.fn(),
        },
        securityLog: {
            create: jest.fn(),
        },
    },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

import { PasswordService } from '@/lib/auth/password-service';
import { TokenService } from '@/lib/auth/token-service';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionService } from '@/lib/auth/session-service';

const prisma = require('@/lib/db').default;

// ═══════════════════════════════════════════════════
// PasswordService Tests
// ═══════════════════════════════════════════════════
describe('PasswordService', () => {
    describe('hash()', () => {
        it('should hash a password and return a bcrypt hash', async () => {
            const password = 'MySecureP@ss1';
            const hash = await PasswordService.hash(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
        });

        it('should produce different hashes for the same password (unique salts)', async () => {
            const password = 'MySecureP@ss1';
            const hash1 = await PasswordService.hash(password);
            const hash2 = await PasswordService.hash(password);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('compare()', () => {
        it('should return true for correct password', async () => {
            const password = 'MySecureP@ss1';
            const hash = await PasswordService.hash(password);

            const isValid = await PasswordService.compare(password, hash);
            expect(isValid).toBe(true);
        });

        it('should return false for incorrect password', async () => {
            const password = 'MySecureP@ss1';
            const hash = await PasswordService.hash(password);

            const isValid = await PasswordService.compare('WrongPassword!1', hash);
            expect(isValid).toBe(false);
        });

        it('should return false for empty password', async () => {
            const hash = await PasswordService.hash('SomeP@ss1');
            const isValid = await PasswordService.compare('', hash);
            expect(isValid).toBe(false);
        });
    });

    describe('isStrong()', () => {
        it('should return true for a strong password', () => {
            expect(PasswordService.isStrong('MyP@ssw0rd!')).toBe(true);
        });

        it('should return false for password shorter than 8 characters', () => {
            expect(PasswordService.isStrong('Ab1@')).toBe(false);
        });

        it('should return false for password without uppercase', () => {
            expect(PasswordService.isStrong('myp@ssw0rd!')).toBe(false);
        });

        it('should return false for password without lowercase', () => {
            expect(PasswordService.isStrong('MYP@SSW0RD!')).toBe(false);
        });

        it('should return false for password without numbers', () => {
            expect(PasswordService.isStrong('MyP@ssword!')).toBe(false);
        });

        it('should return false for password without special characters', () => {
            expect(PasswordService.isStrong('MyPassw0rd')).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════
// TokenService Tests (jose is mocked)
// ═══════════════════════════════════════════════════
describe('TokenService', () => {
    describe('generateAccessToken()', () => {
        it('should return a token string', async () => {
            const token = await TokenService.generateAccessToken({
                userId: 'user123',
                role: 'USER',
                sessionId: 'session456',
            });

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
        });
    });

    describe('generateRefreshToken()', () => {
        it('should return a token string', async () => {
            const token = await TokenService.generateRefreshToken('user123', 'session456');

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
        });
    });

    describe('verifyToken()', () => {
        it('should return payload for a valid token', async () => {
            const token = await TokenService.generateAccessToken({
                userId: 'user123',
                role: 'USER',
            });

            const payload = await TokenService.verifyToken<{ userId: string }>(token);
            // With mocked jose, jwtVerify returns a preset payload
            expect(payload).toBeDefined();
        });
    });
});

// ═══════════════════════════════════════════════════
// SessionService Tests
// ═══════════════════════════════════════════════════
describe('SessionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('revokeSession()', () => {
        it('should deactivate session and clear refresh token', async () => {
            prisma.session.update.mockResolvedValue({});

            await SessionService.revokeSession('session123');

            expect(prisma.session.update).toHaveBeenCalledWith({
                where: { id: 'session123' },
                data: { isActive: false, refreshToken: null },
            });
        });

        it('should not throw on empty sessionId', async () => {
            await expect(SessionService.revokeSession('')).resolves.not.toThrow();
            expect(prisma.session.update).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllSessions()', () => {
        it('should revoke all active sessions for a user', async () => {
            prisma.session.updateMany.mockResolvedValue({ count: 3 });

            const count = await SessionService.revokeAllSessions('user123');

            expect(count).toBe(3);
            expect(prisma.session.updateMany).toHaveBeenCalledWith({
                where: { userId: 'user123', isActive: true },
                data: { isActive: false, refreshToken: null },
            });
        });

        it('should exclude specified session when provided', async () => {
            prisma.session.updateMany.mockResolvedValue({ count: 2 });

            const count = await SessionService.revokeAllSessions('user123', 'keep-this-session');

            expect(count).toBe(2);
            expect(prisma.session.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userId: 'user123',
                        isActive: true,
                        NOT: { id: 'keep-this-session' },
                    }),
                })
            );
        });
    });

    describe('getActiveSessions()', () => {
        it('should return active non-expired sessions', async () => {
            const mockSessions = [
                { id: 's1', ip: '1.1.1.1', userAgent: 'Chrome' },
                { id: 's2', ip: '2.2.2.2', userAgent: 'Firefox' },
            ];
            prisma.session.findMany.mockResolvedValue(mockSessions);

            const sessions = await SessionService.getActiveSessions('user123');

            expect(sessions).toHaveLength(2);
            expect(prisma.session.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userId: 'user123',
                        isActive: true,
                    }),
                })
            );
        });
    });
});

// ═══════════════════════════════════════════════════
// AuthService Tests
// ═══════════════════════════════════════════════════
describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login()', () => {
        it('should normalize email before querying user record', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.securityLog.create.mockResolvedValue({});

            await AuthService.login({
                email: '  TEST@TEST.COM  ',
                password: 'P@ssw0rd!',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            expect(prisma.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { email: 'test@test.com' },
                })
            );
        });

        it('should reject overly long passwords before database query', async () => {
            prisma.securityLog.create.mockResolvedValue({});

            const result = await AuthService.login({
                email: 'test@test.com',
                password: 'a'.repeat(257),
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(401);
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });

        it('should return error for non-existent user', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.securityLog.create.mockResolvedValue({});

            const result = await AuthService.login({
                email: 'nonexistent@test.com',
                password: 'P@ssw0rd!',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid email or password');
            expect(result.statusCode).toBe(401);
        });

        it('should return error for wrong password', async () => {
            const hashedPassword = await PasswordService.hash('CorrectP@ss1');

            prisma.user.findUnique.mockResolvedValue({
                id: 'user1',
                email: 'test@test.com',
                username: 'testuser',
                passwordHash: hashedPassword,
                role: 'USER',
                avatar: null,
                emailVerified: true,
            });
            prisma.securityLog.create.mockResolvedValue({});

            const result = await AuthService.login({
                email: 'test@test.com',
                password: 'WrongP@ss1',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid email or password');
        });

        it('should return SAME error message for wrong email and wrong password (prevents user enumeration)', async () => {
            // Test 1: Non-existent user
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.securityLog.create.mockResolvedValue({});

            const resultNoUser = await AuthService.login({
                email: 'nonexistent@test.com',
                password: 'P@ssw0rd!',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            // Test 2: Wrong password for existing user
            const hashedPassword = await PasswordService.hash('CorrectP@ss1');
            prisma.user.findUnique.mockResolvedValue({
                id: 'user1',
                email: 'test@test.com',
                passwordHash: hashedPassword,
                role: 'USER',
            });

            const resultWrongPass = await AuthService.login({
                email: 'test@test.com',
                password: 'WrongP@ss1',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            // CRITICAL SECURITY CHECK: Same error prevents enumeration
            expect(resultNoUser.error).toBe(resultWrongPass.error);
            expect(resultNoUser.error).toBe('Invalid email or password');
        });

        it('should login successfully with correct credentials', async () => {
            const password = 'MyP@ssw0rd!';
            const hashedPassword = await PasswordService.hash(password);

            prisma.user.findUnique.mockResolvedValue({
                id: 'user1',
                email: 'test@test.com',
                username: 'testuser',
                passwordHash: hashedPassword,
                role: 'USER',
                avatar: null,
                emailVerified: true,
            });

            prisma.session.create.mockResolvedValue({
                id: 'session1',
                userId: 'user1',
            });
            prisma.session.update.mockResolvedValue({});
            prisma.user.update.mockResolvedValue({});
            prisma.securityLog.create.mockResolvedValue({});

            const result = await AuthService.login({
                email: 'test@test.com',
                password,
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user!.email).toBe('test@test.com');
            expect(result.user!.role).toBe('USER');
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.sessionId).toBe('session1');
        });

        it('should log security event on failed login', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.securityLog.create.mockResolvedValue({});

            await AuthService.login({
                email: 'bad@test.com',
                password: 'P@ssw0rd!',
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
            });

            // SecurityLogger.logFailedLogin should have been called
            expect(prisma.securityLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        eventType: 'LOGIN_FAILED',
                        ip: '192.168.1.1',
                    }),
                })
            );
        });
    });

    describe('register()', () => {
        it('should return ambiguous success for existing email', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

            const result = await AuthService.register({
                email: 'existing@test.com',
                password: 'MyP@ssw0rd!',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            // Intentionally returns success=true to prevent email enumeration
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
        });

        it('should create user successfully for new email', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({
                id: 'new-user-1',
                email: 'new@test.com',
                username: 'new',
                role: 'USER',
                avatar: null,
                emailVerified: false,
            });
            prisma.securityLog.create.mockResolvedValue({});

            const result = await AuthService.register({
                email: 'new@test.com',
                username: 'newuser',
                password: 'MyP@ssw0rd!',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(201);
        });

        it('should normalize email to lowercase', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({
                id: 'user-1',
                email: 'test@test.com',
                username: 'test',
                role: 'USER',
                avatar: null,
                emailVerified: false,
            });
            prisma.securityLog.create.mockResolvedValue({});

            await AuthService.register({
                email: 'TEST@TEST.COM',
                password: 'MyP@ssw0rd!',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@test.com' },
            });
        });
    });

    describe('verifyEmail()', () => {
        it('should return error for invalid/expired token', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            const result = await AuthService.verifyEmail('invalid-token');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid or expired');
        });

        it('should verify email for valid token', async () => {
            prisma.user.findFirst.mockResolvedValue({
                id: 'user-1',
                emailVerified: false,
            });
            prisma.user.update.mockResolvedValue({});

            const result = await AuthService.verifyEmail('valid-token-here');

            expect(result.success).toBe(true);
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        emailVerified: true,
                        emailVerificationToken: null,
                        emailVerificationExpires: null,
                    }),
                })
            );
        });
    });

    describe('getCurrentUser()', () => {
        it('should return user profile without sensitive data', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'user@test.com',
                username: 'user1',
                role: 'USER',
            });

            const user = await AuthService.getCurrentUser('user-1');

            expect(user).toBeDefined();
            // Should NOT contain passwordHash
            expect(user).not.toHaveProperty('passwordHash');
        });
    });
});

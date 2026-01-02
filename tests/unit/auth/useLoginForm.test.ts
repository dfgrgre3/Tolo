/**
 * 🧪 useLoginForm Hook Tests - Updated for actual API
 * 
 * اختبارات وحدة لـ hook تسجيل الدخول
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { toast } from 'sonner';

// Mock dependencies
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
    }),
    useSearchParams: () => new URLSearchParams(),
}));

const mockLogin = jest.fn();
const mockVerifyTwoFactor = jest.fn();

jest.mock('@/lib/api/auth-client', () => ({
    loginUser: (...args: any[]) => mockLogin(...args),
    verifyTwoFactor: (...args: any[]) => mockVerifyTwoFactor(...args),
}));

const mockUnifiedLogin = jest.fn();
const mockRefreshUser = jest.fn();

jest.mock('@/contexts/auth-context', () => ({
    useUnifiedAuth: () => ({
        login: mockUnifiedLogin.mockResolvedValue(true),
        refreshUser: mockRefreshUser,
    }),
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    return {
        useAnimation: () => ({
            start: jest.fn().mockReturnValue(new Promise(() => { })), // Never resolves
            stop: jest.fn(),
        }),
        AnimatePresence: ({ children }: any) => children,
        motion: {
            div: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('div', { ref, ...props }, children)),
        },
    };
});

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        loading: jest.fn(),
        dismiss: jest.fn(),
        info: jest.fn(),
    },
}));

jest.mock('@/lib/safe-client-utils', () => ({
    isBrowser: jest.fn(() => true),
    safeWindow: jest.fn((cb) => cb(window)),
    getClientDeviceFingerprint: jest.fn().mockResolvedValue({}),
}));

describe('useLoginForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should initialize with empty form data', () => {
            const { result } = renderHook(() => useLoginForm());

            expect(result.current.formData.email).toBe('');
            expect(result.current.formData.password).toBe('');
            expect(result.current.formData.rememberMe).toBe(false);
        });

        it('should not be loading initially', () => {
            const { result } = renderHook(() => useLoginForm());

            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('Form Interaction', () => {
        it('should update form data on input change', () => {
            const { result } = renderHook(() => useLoginForm());

            act(() => {
                result.current.handleInputChange({
                    target: { name: 'email', value: 'test@example.com', type: 'text' }
                } as any);
            });

            expect(result.current.formData.email).toBe('test@example.com');
        });

        it('should toggle password visibility', () => {
            const { result } = renderHook(() => useLoginForm());

            expect(result.current.showPassword).toBe(false);

            act(() => {
                result.current.setShowPassword(true);
            });

            expect(result.current.showPassword).toBe(true);
        });
    });

    describe('Login Submission', () => {
        it('should handle successful login', async () => {
            const { result } = renderHook(() => useLoginForm());

            // Setup form data
            act(() => {
                result.current.handleInputChange({
                    target: { name: 'email', value: 'valid@example.com', type: 'text' }
                } as any);
                result.current.handleInputChange({
                    target: { name: 'password', value: 'Password123!', type: 'password' }
                } as any);
            });

            // Mock successful API response
            mockLogin.mockResolvedValueOnce({
                token: 'fake-token',
                user: { id: '1', email: 'valid@example.com', name: 'Test User' },
                sessionId: 'session-123'
            });

            // Submit form
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: jest.fn() } as any);
            });

            expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
                email: 'valid@example.com',
                password: 'Password123!'
            }));
            expect(mockUnifiedLogin).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalled();
            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalled();
            });
        });

        it('should handle validation errors', async () => {
            const { result } = renderHook(() => useLoginForm());

            // Submit empty form
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: jest.fn() } as any);
            });

            expect(mockLogin).not.toHaveBeenCalled();
            await waitFor(() => {
                expect(result.current.isShaking).toBe(true);
            });
            expect(toast.error).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            const { result } = renderHook(() => useLoginForm());

            // Setup form data
            act(() => {
                result.current.handleInputChange({
                    target: { name: 'email', value: 'valid@example.com', type: 'text' }
                } as any);
                result.current.handleInputChange({
                    target: { name: 'password', value: 'Password123!', type: 'password' }
                } as any);
            });

            // Mock API error
            mockLogin.mockRejectedValueOnce({
                code: 'INVALID_CREDENTIALS',
                error: 'Invalid email or password'
            });

            // Submit form
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: jest.fn() } as any);
            });

            expect(result.current.formErrorCode).toBe('INVALID_CREDENTIALS');
            expect(toast.error).toHaveBeenCalled();
            await waitFor(() => {
                expect(result.current.isShaking).toBe(true);
            });
        });

        it('should handle 2FA requirement', async () => {
            const { result } = renderHook(() => useLoginForm());

            // Setup form data
            act(() => {
                result.current.handleInputChange({
                    target: { name: 'email', value: '2fa@example.com', type: 'text' }
                } as any);
                result.current.handleInputChange({
                    target: { name: 'password', value: 'Password123!', type: 'password' }
                } as any);
            });

            // Mock 2FA required response
            mockLogin.mockResolvedValueOnce({
                requiresTwoFactor: true,
                loginAttemptId: 'attempt-123'
            });

            // Submit form
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: jest.fn() } as any);
            });

            expect(result.current.showTwoFactor).toBe(true);
            expect(result.current.loginAttemptId).toBe('attempt-123');
            expect(toast.info).toHaveBeenCalled();
        });
    });

    describe('Two Factor Submission', () => {
        it('should handle successful 2FA verification', async () => {
            const { result } = renderHook(() => useLoginForm());

            // Setup 2FA state
            act(() => {
                result.current.setShowTwoFactor(true);
                result.current.setLoginAttemptId('attempt-123');
                result.current.setTwoFactorCode('123456');
            });

            // Mock successful verification
            mockVerifyTwoFactor.mockResolvedValueOnce({
                token: 'fake-token',
                user: { id: '1', email: 'test@example.com' }
            });

            // Submit 2FA
            await act(async () => {
                await result.current.handleTwoFactorSubmit({ preventDefault: jest.fn() } as any);
            });

            expect(mockVerifyTwoFactor).toHaveBeenCalledWith({
                loginAttemptId: 'attempt-123',
                code: '123456'
            });
            expect(mockUnifiedLogin).toHaveBeenCalled();
        });

        it('should validate 2FA code length', async () => {
            const { result } = renderHook(() => useLoginForm());

            act(() => {
                result.current.setShowTwoFactor(true);
                result.current.setTwoFactorCode('123'); // Too short
            });

            await act(async () => {
                await result.current.handleTwoFactorSubmit({ preventDefault: jest.fn() } as any);
            });

            expect(mockVerifyTwoFactor).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalled();
            expect(result.current.isShaking).toBe(true);
        });
    });
});

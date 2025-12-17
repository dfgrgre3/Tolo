'use client';

/**
 * 🔑 usePasskeyAuthentication - Hook for passkey-based authentication
 * 
 * يوفر واجهة سهلة للمصادقة بالـ Passkeys
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getPasskeyManager } from '../passkeys/PasskeyManager';
import { getSyncedPasskeyService } from '../passkeys/SyncedPasskeyService';
import { logger } from '@/lib/logger';

interface PasskeyAuthState {
    isSupported: boolean;
    isPlatformSupported: boolean;
    isConditionalUISupported: boolean;
    isSyncedPasskeysSupported: boolean;
    isLoading: boolean;
    error: string | null;
    lastAuthenticatedAt: Date | null;
}

interface UsePasskeyAuthenticationReturn extends PasskeyAuthState {
    // Authentication methods
    authenticateWithPasskey: (challenge?: string) => Promise<string | null>;
    authenticateWithDiscoverable: () => Promise<{ userHandle: string; token: string } | null>;
    startConditionalUI: () => Promise<void>;
    stopConditionalUI: () => void;

    // Registration
    registerPasskey: (deviceName?: string) => Promise<boolean>;

    // Utilities
    clearError: () => void;
    refresh: () => void;
}

export function usePasskeyAuthentication(): UsePasskeyAuthenticationReturn {
    const [state, setState] = useState<PasskeyAuthState>({
        isSupported: false,
        isPlatformSupported: false,
        isConditionalUISupported: false,
        isSyncedPasskeysSupported: false,
        isLoading: true,
        error: null,
        lastAuthenticatedAt: null,
    });

    const passkeyManager = getPasskeyManager();
    const syncedService = getSyncedPasskeyService();
    const conditionalAbortController = useRef<AbortController | null>(null);

    // Initialize and check capabilities
    const checkCapabilities = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const isSupported = passkeyManager.isSupported();

            if (!isSupported) {
                setState(prev => ({
                    ...prev,
                    isSupported: false,
                    isLoading: false,
                }));
                return;
            }

            const [isPlatformSupported, isConditionalUISupported, isSyncedPasskeysSupported] =
                await Promise.all([
                    passkeyManager.isPlatformAuthenticatorAvailable(),
                    passkeyManager.isConditionalUISupported(),
                    syncedService.isSyncedPasskeysSupported(),
                ]);

            setState(prev => ({
                ...prev,
                isSupported,
                isPlatformSupported,
                isConditionalUISupported,
                isSyncedPasskeysSupported,
                isLoading: false,
            }));
        } catch (error) {
            logger.error('Failed to check passkey capabilities:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'فشل في التحقق من دعم المتصفح',
            }));
        }
    }, [passkeyManager, syncedService]);

    useEffect(() => {
        checkCapabilities();
    }, [checkCapabilities]);

    // Cleanup conditional UI on unmount
    useEffect(() => {
        return () => {
            if (conditionalAbortController.current) {
                conditionalAbortController.current.abort();
            }
        };
    }, []);

    // Authenticate with existing passkey
    const authenticateWithPasskey = useCallback(async (
        challenge?: string
    ): Promise<string | null> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Get challenge from server if not provided
            let authChallenge = challenge;
            if (!authChallenge) {
                const res = await fetch('/api/auth/passkey/authenticate-options', {
                    method: 'POST',
                });
                if (!res.ok) throw new Error('Failed to get authentication options');
                const options = await res.json();
                authChallenge = options.challenge;
            }

            // Get credential
            const result = await passkeyManager.authenticateWithPasskey({
                challenge: authChallenge!,
                rpId: window.location.hostname,
                userVerification: 'required',
            });

            // Verify with server
            const verifyRes = await fetch('/api/auth/passkey/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result),
            });

            if (!verifyRes.ok) {
                const error = await verifyRes.json();
                throw new Error(error.message || 'Authentication failed');
            }

            const { token } = await verifyRes.json();

            setState(prev => ({
                ...prev,
                isLoading: false,
                lastAuthenticatedAt: new Date(),
            }));

            return token;
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'فشل في المصادقة',
            }));
            return null;
        }
    }, [passkeyManager]);

    // Authenticate with discoverable credential (passwordless)
    const authenticateWithDiscoverable = useCallback(async (): Promise<{
        userHandle: string;
        token: string;
    } | null> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Get challenge
            const res = await fetch('/api/auth/passkey/authenticate-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discoverable: true }),
            });
            if (!res.ok) throw new Error('Failed to get authentication options');
            const options = await res.json();

            // Authenticate with discoverable credential
            const { assertion, credential } =
                await syncedService.authenticateWithDiscoverableCredential({
                    rpId: window.location.hostname,
                    challenge: options.challenge,
                    userVerification: 'required',
                });

            // Verify with server
            const verifyRes = await fetch('/api/auth/passkey/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentialId: credential.id,
                    ...assertion,
                }),
            });

            if (!verifyRes.ok) {
                const error = await verifyRes.json();
                throw new Error(error.message || 'Authentication failed');
            }

            const result = await verifyRes.json();

            setState(prev => ({
                ...prev,
                isLoading: false,
                lastAuthenticatedAt: new Date(),
            }));

            return {
                userHandle: assertion.userHandle!,
                token: result.token,
            };
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'فشل في المصادقة',
            }));
            return null;
        }
    }, [syncedService]);

    // Start conditional UI (autofill)
    const startConditionalUI = useCallback(async (): Promise<void> => {
        if (!state.isConditionalUISupported) {
            logger.warn('Conditional UI not supported');
            return;
        }

        try {
            // Abort any existing conditional UI
            if (conditionalAbortController.current) {
                conditionalAbortController.current.abort();
            }
            conditionalAbortController.current = new AbortController();

            // Get challenge
            const res = await fetch('/api/auth/passkey/authenticate-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conditional: true }),
            });
            if (!res.ok) throw new Error('Failed to get options');
            const options = await res.json();

            // Start conditional UI authentication
            const { assertion, credential } =
                await syncedService.startConditionalUIAuthentication(
                    {
                        rpId: window.location.hostname,
                        challenge: options.challenge,
                        userVerification: 'preferred',
                    },
                    conditionalAbortController.current.signal
                );

            // Verify and login
            const verifyRes = await fetch('/api/auth/passkey/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentialId: credential.id,
                    ...assertion,
                    conditional: true,
                }),
            });

            if (verifyRes.ok) {
                setState(prev => ({
                    ...prev,
                    lastAuthenticatedAt: new Date(),
                }));

                // Redirect or callback
                window.location.href = '/dashboard';
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') return;

            logger.error('Conditional UI error:', error);
        }
    }, [state.isConditionalUISupported, syncedService]);

    // Stop conditional UI
    const stopConditionalUI = useCallback(() => {
        if (conditionalAbortController.current) {
            conditionalAbortController.current.abort();
            conditionalAbortController.current = null;
        }
    }, []);

    // Register new passkey
    const registerPasskey = useCallback(async (
        deviceName?: string
    ): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Get registration options from server
            const res = await fetch('/api/auth/passkey/register-options', {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to get registration options');
            const options = await res.json();

            // Register passkey
            await passkeyManager.registerPasskey(options, deviceName);

            setState(prev => ({
                ...prev,
                isLoading: false,
            }));

            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'فشل في تسجيل مفتاح المرور';
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: message,
            }));
            return false;
        }
    }, [passkeyManager]);

    // Clear error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Refresh capabilities
    const refresh = useCallback(() => {
        checkCapabilities();
    }, [checkCapabilities]);

    return {
        ...state,
        authenticateWithPasskey,
        authenticateWithDiscoverable,
        startConditionalUI,
        stopConditionalUI,
        registerPasskey,
        clearError,
        refresh,
    };
}

export default usePasskeyAuthentication;

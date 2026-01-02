/**
 * Biometric and Passkey API operations
 */

import { apiFetch } from './core';
import type {
    BiometricChallengeRequest,
    BiometricChallengeResponse,
    BiometricVerifyRequest,
    BiometricVerifyResponse,
    LoginResponse,
} from '@/types/api/auth';

/**
 * Get Biometric Challenge
 */
export async function getBiometricChallenge(
    request: BiometricChallengeRequest | { type: 'authenticate' | 'register' | 'options'; userId?: string }
): Promise<BiometricChallengeResponse & { options?: unknown; challenge?: string }> {
    const body = typeof request === 'object' && 'type' in request
        ? { action: request.type === 'authenticate' ? 'authenticate' : request.type === 'register' ? 'register' : 'options', userId: (request as { userId?: string }).userId }
        : request;

    return apiFetch<BiometricChallengeResponse & { options?: any; challenge?: string }>('/biometric', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * Verify Biometric Authentication
 */
export async function verifyBiometric(
    request: BiometricVerifyRequest
): Promise<BiometricVerifyResponse> {
    return apiFetch<BiometricVerifyResponse>('/biometric/authenticate', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

/**
 * Get Passkey Registration Options
 */
export async function getPasskeyRegistrationOptions(userId: string): Promise<unknown> {
    return apiFetch('/passkey/register-options', {
        method: 'POST',
        body: JSON.stringify({ userId }),
    });
}

/**
 * Verify Passkey Registration
 */
export async function verifyPasskeyRegistration(data: unknown): Promise<unknown> {
    return apiFetch('/passkey/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get Passkey Authentication Options
 */
export async function getPasskeyAuthenticationOptions(userId?: string): Promise<unknown> {
    return apiFetch('/passkey/authenticate-options', {
        method: 'POST',
        body: JSON.stringify({ userId }),
    });
}

/**
 * Verify Passkey Authentication
 */
export async function verifyPasskeyAuthentication(data: unknown): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/passkey/authenticate', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Setup biometric authentication
 */
export async function setupBiometric(data: {
    credentialId: string;
    publicKey: string;
    deviceName?: string;
}): Promise<{
    message: string;
    credentialId: string;
    challenge: string;
}> {
    return apiFetch<{
        message: string;
        credentialId: string;
        challenge: string;
    }>('/biometric/setup', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Register biometric credential
 */
export async function registerBiometric(data: {
    credential: any;
    deviceName?: string;
}): Promise<{
    message: string;
    credentialId: string;
}> {
    return apiFetch<{ message: string; credentialId: string }>('/biometric/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get biometric credentials
 */
export async function getBiometricCredentials(): Promise<{
    credentials: Array<{
        id: string;
        credentialId: string;
        deviceName: string;
        createdAt: string;
    }>;
}> {
    return apiFetch<{
        credentials: Array<{
            id: string;
            credentialId: string;
            deviceName: string;
            createdAt: string;
        }>;
    }>('/biometric', {
        method: 'GET',
    });
}

/**
 * Delete biometric credential
 */
export async function deleteBiometric(credentialId: string): Promise<{
    message: string;
}> {
    return apiFetch<{ message: string }>('/biometric/setup', {
        method: 'DELETE',
        body: JSON.stringify({ credentialId }),
    });
}

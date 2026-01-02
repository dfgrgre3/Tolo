/**
 * 🔑 Synced Passkeys Service
 * 
 * خدمة مزامنة Passkeys عبر الأجهزة
 * تدعم iCloud Keychain, Google Password Manager, 1Password, etc.
 */

import { logger } from '@/lib/logger';
import type { PasskeyCredential } from './PasskeyManager';

export interface SyncedPasskeyInfo {
    credentialId: string;
    userHandle: string;
    rpId: string;
    transports: AuthenticatorTransport[];
    deviceType: 'platform' | 'cross-platform' | 'hybrid';
    isSynced: boolean;
    syncProvider?: 'icloud' | 'google' | '1password' | 'other' | 'unknown';
    createdAt: Date;
    lastUsedAt?: Date;
}

export interface DiscoverableCredentialOptions {
    rpId: string;
    challenge: string;
    timeout?: number;
    userVerification?: UserVerificationRequirement;
    mediation?: 'conditional' | 'optional' | 'required' | 'silent';
}

/**
 * Service for managing synced (discoverable) passkeys
 * that work across devices via platform sync services
 */
export class SyncedPasskeyService {
    private rpId: string;

    constructor(rpId?: string) {
        this.rpId = rpId || this.getDefaultRpId();
    }

    /**
     * Check if synced passkeys are supported
     */
    async isSyncedPasskeysSupported(): Promise<boolean> {
        if (typeof window === 'undefined') return false;
        if (!window.PublicKeyCredential) return false;

        try {
            // Check for platform authenticator (required for synced passkeys)
            const hasPlatformAuth =
                await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

            if (!hasPlatformAuth) return false;

            // Check for conditional mediation (indicates modern passkey support)
            if (typeof PublicKeyCredential.isConditionalMediationAvailable === 'function') {
                return await PublicKeyCredential.isConditionalMediationAvailable();
            }

            return hasPlatformAuth;
        } catch (error) {
            logger.warn('Error checking synced passkey support:', error);
            return false;
        }
    }

    /**
     * Register a synced passkey (discoverable credential)
     */
    async registerSyncedPasskey(options: {
        challenge: ArrayBuffer | string;
        userId: string;
        userName: string;
        userDisplayName: string;
        deviceName?: string;
        excludeCredentials?: PublicKeyCredentialDescriptor[];
    }): Promise<{
        credential: PublicKeyCredential;
        attestation: {
            clientDataJSON: string;
            attestationObject: string;
            transports?: string[];
        };
    }> {
        const challenge = typeof options.challenge === 'string'
            ? this.base64urlToBuffer(options.challenge)
            : options.challenge;

        const publicKeyOptions: PublicKeyCredentialCreationOptions = {
            challenge,
            rp: {
                id: this.rpId,
                name: document.title || 'Thanawy',
            },
            user: {
                id: new TextEncoder().encode(options.userId),
                name: options.userName,
                displayName: options.userDisplayName,
            },
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 },   // ES256
                { type: 'public-key', alg: -257 }, // RS256
                { type: 'public-key', alg: -8 },   // EdDSA
            ],
            authenticatorSelection: {
                // Key settings for synced passkeys
                authenticatorAttachment: 'platform',
                residentKey: 'required',           // Makes it discoverable
                requireResidentKey: true,         // Backwards compatibility
                userVerification: 'required',
            },
            timeout: 120000, // 2 minutes
            attestation: 'none', // Don't need attestation for most use cases
            excludeCredentials: options.excludeCredentials,
            // Request hints for better UX
            extensions: {
                credProps: true, // Get credential properties
            },
        };

        try {
            const credential = await navigator.credentials.create({
                publicKey: publicKeyOptions,
            }) as PublicKeyCredential;

            if (!credential) {
                throw new Error('No credential returned');
            }

            const response = credential.response as AuthenticatorAttestationResponse;

            return {
                credential,
                attestation: {
                    clientDataJSON: this.bufferToBase64url(response.clientDataJSON),
                    attestationObject: this.bufferToBase64url(response.attestationObject),
                    transports: response.getTransports?.() || [],
                },
            };
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'NotAllowedError') {
                throw new Error('تم إلغاء تسجيل مفتاح المرور');
            }
            if (err.name === 'InvalidStateError') {
                throw new Error('مفتاح المرور مسجل بالفعل على هذا الجهاز');
            }
            throw error;
        }
    }

    /**
     * Authenticate with discoverable credential (no username needed)
     * User can select from their synced passkeys
     */
    async authenticateWithDiscoverableCredential(
        options: DiscoverableCredentialOptions
    ): Promise<{
        credential: PublicKeyCredential;
        assertion: {
            clientDataJSON: string;
            authenticatorData: string;
            signature: string;
            userHandle: string | null;
        };
    }> {
        const challenge = this.base64urlToBuffer(options.challenge);

        const publicKeyOptions: PublicKeyCredentialRequestOptions = {
            challenge,
            rpId: options.rpId,
            timeout: options.timeout || 60000,
            userVerification: options.userVerification || 'required',
            // Empty allowCredentials = discoverable credential
            allowCredentials: [],
        };

        try {
            const credential = await navigator.credentials.get({
                publicKey: publicKeyOptions,
                mediation: options.mediation,
            } as CredentialRequestOptions) as PublicKeyCredential;

            if (!credential) {
                throw new Error('No credential selected');
            }

            const response = credential.response as AuthenticatorAssertionResponse;

            return {
                credential,
                assertion: {
                    clientDataJSON: this.bufferToBase64url(response.clientDataJSON),
                    authenticatorData: this.bufferToBase64url(response.authenticatorData),
                    signature: this.bufferToBase64url(response.signature),
                    userHandle: response.userHandle
                        ? this.bufferToBase64url(response.userHandle)
                        : null,
                },
            };
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'NotAllowedError') {
                throw new Error('تم إلغاء المصادقة');
            }
            throw error;
        }
    }

    /**
     * Start conditional UI authentication
     * Shows passkeys in autofill dropdown when user focuses on username field
     */
    async startConditionalUIAuthentication(
        options: Omit<DiscoverableCredentialOptions, 'mediation'>,
        abortSignal?: AbortSignal
    ): Promise<{
        credential: PublicKeyCredential;
        assertion: {
            clientDataJSON: string;
            authenticatorData: string;
            signature: string;
            userHandle: string | null;
        };
    }> {
        // Check if conditional UI is supported
        if (typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') {
            throw new Error('المتصفح لا يدعم Autofill للـ Passkeys');
        }

        const isSupported = await PublicKeyCredential.isConditionalMediationAvailable();
        if (!isSupported) {
            throw new Error('Conditional UI غير متاح');
        }

        const challenge = this.base64urlToBuffer(options.challenge);

        const publicKeyOptions: PublicKeyCredentialRequestOptions = {
            challenge,
            rpId: options.rpId,
            timeout: options.timeout || 300000, // 5 minutes for conditional UI
            userVerification: options.userVerification || 'preferred',
            allowCredentials: [], // Empty for discoverable
        };

        try {
            const credential = await navigator.credentials.get({
                publicKey: publicKeyOptions,
                mediation: 'conditional',
                signal: abortSignal,
            } as CredentialRequestOptions) as PublicKeyCredential;

            if (!credential) {
                throw new Error('No credential selected');
            }

            const response = credential.response as AuthenticatorAssertionResponse;

            return {
                credential,
                assertion: {
                    clientDataJSON: this.bufferToBase64url(response.clientDataJSON),
                    authenticatorData: this.bufferToBase64url(response.authenticatorData),
                    signature: this.bufferToBase64url(response.signature),
                    userHandle: response.userHandle
                        ? this.bufferToBase64url(response.userHandle)
                        : null,
                },
            };
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                throw new Error('تم إلغاء العملية');
            }
            throw error;
        }
    }

    /**
     * Detect sync provider from client hints or platform
     */
    detectSyncProvider(): SyncedPasskeyInfo['syncProvider'] {
        if (typeof window === 'undefined') return 'unknown';

        const ua = navigator.userAgent;
        const platform = navigator.platform;

        // Apple devices use iCloud Keychain
        if (/Mac|iPhone|iPad|iPod/.test(platform) || /Safari/.test(ua)) {
            return 'icloud';
        }

        // Chrome on any platform uses Google Password Manager
        if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
            return 'google';
        }

        // Check for 1Password or other extension
        if ((window as unknown as { __1password?: boolean }).__1password) {
            return '1password';
        }

        return 'other';
    }

    /**
     * Get friendly name for sync provider
     */
    getSyncProviderName(provider: SyncedPasskeyInfo['syncProvider']): {
        en: string;
        ar: string;
    } {
        switch (provider) {
            case 'icloud':
                return { en: 'iCloud Keychain', ar: 'سلسلة مفاتيح iCloud' };
            case 'google':
                return { en: 'Google Password Manager', ar: 'مدير كلمات مرور Google' };
            case '1password':
                return { en: '1Password', ar: '1Password' };
            case 'other':
                return { en: 'Password Manager', ar: 'مدير كلمات المرور' };
            default:
                return { en: 'Unknown', ar: 'غير معروف' };
        }
    }

    // ============================================
    // Helper Methods
    // ============================================

    private getDefaultRpId(): string {
        if (typeof window === 'undefined') return 'localhost';
        return window.location.hostname;
    }

    private base64urlToBuffer(base64url: string): ArrayBuffer {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    private bufferToBase64url(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
}

// Singleton instance
let syncedPasskeyServiceInstance: SyncedPasskeyService | null = null;

export function getSyncedPasskeyService(rpId?: string): SyncedPasskeyService {
    if (!syncedPasskeyServiceInstance || rpId) {
        syncedPasskeyServiceInstance = new SyncedPasskeyService(rpId);
    }
    return syncedPasskeyServiceInstance;
}

export default SyncedPasskeyService;

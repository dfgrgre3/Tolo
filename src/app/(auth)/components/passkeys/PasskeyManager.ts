/**
 * Advanced Passkey (WebAuthn) Management System
 * Passwordless authentication using FIDO2/WebAuthn
 */

import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface PasskeyCredential {
  id: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName: string;
  deviceType: 'platform' | 'cross-platform';
  createdAt: Date;
  lastUsedAt?: Date;
  aaguid?: string;
  transports?: AuthenticatorTransport[];
}

export interface PasskeyRegistrationOptions {
  challenge: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  rpName: string;
  rpId: string;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

export interface PasskeyAuthenticationOptions {
  challenge: string;
  rpId: string;
  timeout?: number;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
}

export class PasskeyManager {
  private readonly storageKey = 'registered_passkeys';

  /**
   * Check if WebAuthn is supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function'
    );
  }

  /**
   * Check if platform authenticator is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      logger.error('Failed to check platform authenticator availability:', error);
      return false;
    }
  }

  /**
   * Check if conditional UI is supported
   */
  async isConditionalUISupported(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    } catch (error) {
      logger.error('Failed to check conditional UI support:', error);
      return false;
    }
  }

  /**
   * Register a new passkey
   */
  async registerPasskey(
    options: PasskeyRegistrationOptions,
    deviceName?: string
  ): Promise<PasskeyCredential> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    try {
      // Convert challenge from base64url to ArrayBuffer
      const challenge = this.base64urlToBuffer(options.challenge);
      const userId = this.base64urlToBuffer(options.userId);

      // Create credential creation options
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: options.rpName,
          id: options.rpId,
        },
        user: {
          id: userId,
          name: options.userName,
          displayName: options.userDisplayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        timeout: options.timeout || 60000,
        attestation: options.attestation || 'none',
        authenticatorSelection: options.authenticatorSelection || {
          authenticatorAttachment: 'platform',
          requireResidentKey: true,
          residentKey: 'required',
          userVerification: 'required',
        },
        excludeCredentials: this.getExcludeCredentials(),
      };

      // Create credential
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Parse response
      const response = credential.response as AuthenticatorAttestationResponse;
      const clientDataJSON = this.bufferToBase64url(response.clientDataJSON);
      const attestationObject = this.bufferToBase64url(response.attestationObject);

      // Get transports if available
      const transports = response.getTransports ? response.getTransports() : undefined;

      // Verify with server
      const verificationResponse = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: credential.id,
          clientDataJSON,
          attestationObject,
          transports,
          deviceName: deviceName || this.getDeviceName(),
        }),
      });

      if (!verificationResponse.ok) {
        const error = await verificationResponse.json();
        throw new Error(error.message || 'Failed to verify passkey registration');
      }

      const verificationData = await verificationResponse.json();

      // Create passkey credential object
      const passkeyCredential: PasskeyCredential = {
        id: verificationData.id,
        credentialId: credential.id,
        publicKey: verificationData.publicKey,
        counter: verificationData.counter || 0,
        deviceName: deviceName || this.getDeviceName(),
        deviceType: publicKeyOptions.authenticatorSelection?.authenticatorAttachment || 'platform',
        createdAt: new Date(),
        transports: Array.isArray(transports) ? transports.filter((t): t is AuthenticatorTransport =>
          ['usb', 'nfc', 'ble', 'internal', 'hybrid'].includes(t)
        ) : undefined,
      };

      // Store locally
      this.storePasskey(passkeyCredential);

      toast.success('تم تسجيل المفتاح بنجاح!');
      return passkeyCredential;
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        logger.info('Passkey registration cancelled by user');
        throw new Error('تم إلغاء عملية التسجيل');
      }

      logger.error('Passkey registration failed:', error);

      if (err.name === 'InvalidStateError') {
        throw new Error('هذا المفتاح مسجل بالفعل');
      } else if (err.name === 'NotSupportedError') {
        throw new Error('المتصفح لا يدعم هذه الميزة');
      }

      throw error;
    }
  }

  /**
   * Authenticate with passkey
   */
  async authenticateWithPasskey(
    options: PasskeyAuthenticationOptions
  ): Promise<{
    credentialId: string;
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string;
  }> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    try {
      // Convert challenge from base64url to ArrayBuffer
      const challenge = this.base64urlToBuffer(options.challenge);

      // Create credential request options
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: options.rpId,
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'required',
        allowCredentials: options.allowCredentials,
      };

      // Get credential
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      // Parse response
      const response = credential.response as AuthenticatorAssertionResponse;
      const authenticatorData = this.bufferToBase64url(response.authenticatorData);
      const clientDataJSON = this.bufferToBase64url(response.clientDataJSON);
      const signature = this.bufferToBase64url(response.signature);
      const userHandle = response.userHandle
        ? this.bufferToBase64url(response.userHandle)
        : undefined;

      // Update last used time locally
      this.updateLastUsed(credential.id);

      return {
        credentialId: credential.id,
        authenticatorData,
        clientDataJSON,
        signature,
        userHandle,
      };
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        logger.info('Passkey authentication cancelled by user');
        throw new Error('تم إلغاء عملية المصادقة');
      }

      logger.error('Passkey authentication failed:', error);

      if (err.name === 'NotSupportedError') {
        throw new Error('المتصفح لا يدعم هذه الميزة');
      }

      throw error;
    }
  }

  /**
   * Authenticate with conditional UI (autofill)
   */
  async authenticateWithConditionalUI(
    options: PasskeyAuthenticationOptions
  ): Promise<{
    credentialId: string;
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string;
  }> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    const isConditionalUISupported = await this.isConditionalUISupported();
    if (!isConditionalUISupported) {
      throw new Error('Conditional UI is not supported in this browser');
    }

    try {
      const challenge = this.base64urlToBuffer(options.challenge);

      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: options.rpId,
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'required',
      };

      // Use conditional mediation
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
        mediation: 'conditional',
      } as CredentialRequestOptions)) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const authenticatorData = this.bufferToBase64url(response.authenticatorData);
      const clientDataJSON = this.bufferToBase64url(response.clientDataJSON);
      const signature = this.bufferToBase64url(response.signature);
      const userHandle = response.userHandle
        ? this.bufferToBase64url(response.userHandle)
        : undefined;

      this.updateLastUsed(credential.id);

      return {
        credentialId: credential.id,
        authenticatorData,
        clientDataJSON,
        signature,
        userHandle,
      };
    } catch (error: unknown) {
      logger.error('Conditional UI authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get all registered passkeys
   */
  getRegisteredPasskeys(): PasskeyCredential[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const passkeys = JSON.parse(stored);
      return passkeys.map((p: PasskeyCredential) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        lastUsedAt: p.lastUsedAt ? new Date(p.lastUsedAt) : undefined,
      }));
    } catch (error) {
      logger.error('Failed to get registered passkeys:', error);
      return [];
    }
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(credentialId: string): Promise<void> {
    try {
      // Delete from server
      const response = await fetch('/api/auth/passkey/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete passkey');
      }

      // Delete locally
      const passkeys = this.getRegisteredPasskeys();
      const filtered = passkeys.filter((p) => p.credentialId !== credentialId);
      this.savePasskeys(filtered);

      toast.success('تم حذف المفتاح بنجاح');
    } catch (error: unknown) {
      logger.error('Failed to delete passkey:', error);
      throw error;
    }
  }

  /**
   * Rename a passkey
   */
  async renamePasskey(credentialId: string, newName: string): Promise<void> {
    try {
      // Update on server
      const response = await fetch('/api/auth/passkey/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId, deviceName: newName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to rename passkey');
      }

      // Update locally
      const passkeys = this.getRegisteredPasskeys();
      const passkey = passkeys.find((p) => p.credentialId === credentialId);
      if (passkey) {
        passkey.deviceName = newName;
        this.savePasskeys(passkeys);
      }

      toast.success('تم تغيير اسم المفتاح بنجاح');
    } catch (error: unknown) {
      logger.error('Failed to rename passkey:', error);
      throw error;
    }
  }

  // Private methods

  private storePasskey(passkey: PasskeyCredential): void {
    const passkeys = this.getRegisteredPasskeys();
    passkeys.push(passkey);
    this.savePasskeys(passkeys);
  }

  private savePasskeys(passkeys: PasskeyCredential[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(passkeys));
    } catch (error) {
      logger.error('Failed to save passkeys:', error);
    }
  }

  private updateLastUsed(credentialId: string): void {
    const passkeys = this.getRegisteredPasskeys();
    const passkey = passkeys.find((p) => p.credentialId === credentialId);
    if (passkey) {
      passkey.lastUsedAt = new Date();
      this.savePasskeys(passkeys);
    }
  }

  private getExcludeCredentials(): PublicKeyCredentialDescriptor[] {
    const passkeys = this.getRegisteredPasskeys();
    return passkeys.map((p) => ({
      id: this.base64urlToBuffer(p.credentialId),
      type: 'public-key' as const,
      transports: p.transports,
    }));
  }

  private getDeviceName(): string {
    if (typeof window === 'undefined') return 'Unknown Device';

    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Mac')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown Device';
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
let passkeyManagerInstance: PasskeyManager | null = null;

export function getPasskeyManager(): PasskeyManager {
  if (!passkeyManagerInstance) {
    passkeyManagerInstance = new PasskeyManager();
  }
  return passkeyManagerInstance;
}


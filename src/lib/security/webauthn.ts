/**
 * WebAuthn / Passkeys Implementation
 * نظام متقدم للمصادقة البيومترية باستخدام WebAuthn API
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  transports?: AuthenticatorTransport[];
  createdAt: Date;
  lastUsed?: Date;
}

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout: number;
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey: boolean;
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
  attestation: 'none' | 'indirect' | 'direct';
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  userVerification: 'required' | 'preferred' | 'discouraged';
  allowCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: AuthenticatorTransport[];
  }>;
}

interface WebAuthnRegistrationResponse {
  id: string;
  rawId: ArrayBuffer | Uint8Array;
  response?: {
    attestationObject?: ArrayBuffer | Uint8Array | string;
    clientDataJSON?: ArrayBuffer | Uint8Array | string;
  };
}

interface WebAuthnAuthenticationResponse {
  id: string;
  rawId: ArrayBuffer | Uint8Array;
  response?: {
    authenticatorData?: ArrayBuffer | Uint8Array | string;
    clientDataJSON?: ArrayBuffer | Uint8Array | string;
    signature?: ArrayBuffer | Uint8Array | string;
  };
}

export class WebAuthnService {
  private static instance: WebAuthnService;
  private rpName: string;
  private rpId: string;
  private origin: string;

  private constructor() {
    this.rpName = process.env.NEXT_PUBLIC_APP_NAME || 'Thanawy';
    this.rpId = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
    this.origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  public static getInstance(): WebAuthnService {
    if (!WebAuthnService.instance) {
      WebAuthnService.instance = new WebAuthnService();
    }
    return WebAuthnService.instance;
  }

  /**
   * Generate registration options for WebAuthn
   */
  generateRegistrationOptions(user: {
    id: string;
    email: string;
    name?: string;
  }): WebAuthnRegistrationOptions {
    const challenge = this.generateChallenge();

    return {
      challenge,
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: user.id,
        name: user.email,
        displayName: user.name || user.email,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
        requireResidentKey: true,
        userVerification: 'required',
      },
      attestation: 'none',
    };
  }

  /**
   * Generate authentication options for WebAuthn
   */
  generateAuthenticationOptions(
    userCredentials?: WebAuthnCredential[]
  ): WebAuthnAuthenticationOptions {
    const challenge = this.generateChallenge();

    const options: WebAuthnAuthenticationOptions = {
      challenge,
      timeout: 60000,
      rpId: this.rpId,
      userVerification: 'required',
    };

    if (userCredentials && userCredentials.length > 0) {
      options.allowCredentials = userCredentials.map((cred) => ({
        type: 'public-key',
        id: cred.credentialId,
        transports: cred.transports,
      }));
    }

    return options;
  }

  /**
   * Verify registration response
   * Note: For full security, use @simplewebauthn/server library for signature verification
   */
  async verifyRegistration(
    response: WebAuthnRegistrationResponse,
    expectedChallenge: string
  ): Promise<{
    verified: boolean;
    credential?: {
      credentialId: string;
      publicKey: string;
      counter: number;
    };
    error?: string;
  }> {
    try {
      // Basic validation
      if (!response || !response.id || !response.rawId) {
        logger.warn('WebAuthn: Invalid registration response - missing id or rawId');
        return {
          verified: false,
          error: 'بيانات التسجيل غير صالحة',
        };
      }

      if (!response.response?.clientDataJSON) {
        logger.warn('WebAuthn: Missing clientDataJSON in registration response');
        return {
          verified: false,
          error: 'بيانات العميل مفقودة',
        };
      }

      // Decode and verify clientDataJSON
      let clientData: { type?: string; challenge?: string; origin?: string };
      try {
        const clientDataStr = typeof response.response.clientDataJSON === 'string'
          ? response.response.clientDataJSON
          : this.arrayBufferToBase64(response.response.clientDataJSON);

        // Decode from base64
        const decodedData = typeof atob !== 'undefined'
          ? atob(clientDataStr)
          : Buffer.from(clientDataStr, 'base64').toString('utf-8');

        clientData = JSON.parse(decodedData);
      } catch (parseError) {
        logger.warn('WebAuthn: Failed to parse clientDataJSON', parseError);
        return {
          verified: false,
          error: 'فشل في تحليل بيانات العميل',
        };
      }

      // Verify type
      if (clientData.type !== 'webauthn.create') {
        logger.warn('WebAuthn: Invalid type in clientData', { type: clientData.type });
        return {
          verified: false,
          error: 'نوع العملية غير صحيح',
        };
      }

      // Verify challenge matches
      if (clientData.challenge !== expectedChallenge) {
        logger.warn('WebAuthn: Challenge mismatch in registration');
        return {
          verified: false,
          error: 'التحدي غير متطابق',
        };
      }

      // Verify origin matches our expected origin
      if (clientData.origin !== this.origin) {
        logger.warn('WebAuthn: Origin mismatch', {
          expected: this.origin,
          received: clientData.origin
        });
        return {
          verified: false,
          error: 'مصدر الطلب غير صحيح',
        };
      }

      // Extract credential data
      const credentialId = response.id;
      let publicKey = '';
      const attestationObject = response.response?.attestationObject;
      if (attestationObject) {
        if (typeof attestationObject === 'string') {
          publicKey = attestationObject;
        } else {
          publicKey = this.arrayBufferToBase64(attestationObject);
        }
      }

      logger.info('WebAuthn: Registration verified successfully', { credentialId });

      return {
        verified: true,
        credential: {
          credentialId,
          publicKey,
          counter: 0,
        },
      };
    } catch (error) {
      logger.error('WebAuthn registration verification error', error, { operation: 'registration_verification' });
      return {
        verified: false,
        error: 'فشل التحقق من التسجيل',
      };
    }
  }

  async verifyAuthentication(
    response: WebAuthnAuthenticationResponse,
    expectedChallenge: string,
    credential: WebAuthnCredential
  ): Promise<{
    verified: boolean;
    newCounter?: number;
    error?: string;
  }> {
    try {
      // 1. Basic validation
      if (!response || !response.id) {
        logger.warn('WebAuthn: Invalid authentication response - missing id');
        return {
          verified: false,
          error: 'بيانات المصادقة غير صالحة',
        };
      }

      // 2. Check if credential ID matches
      if (response.id !== credential.credentialId) {
        logger.warn('WebAuthn: Credential ID mismatch', {
          expected: credential.credentialId.substring(0, 8) + '...',
          received: response.id.substring(0, 8) + '...'
        });
        return {
          verified: false,
          error: 'معرف بيانات الاعتماد غير متطابق',
        };
      }

      // 3. Validate response has required fields
      if (!response.response?.clientDataJSON || !response.response?.authenticatorData || !response.response?.signature) {
        logger.warn('WebAuthn: Missing required response fields');
        return {
          verified: false,
          error: 'بيانات المصادقة ناقصة',
        };
      }

      // 4. Decode and verify clientDataJSON
      let clientData: { type?: string; challenge?: string; origin?: string };
      try {
        const clientDataStr = typeof response.response.clientDataJSON === 'string'
          ? response.response.clientDataJSON
          : this.arrayBufferToBase64(response.response.clientDataJSON);

        const decodedData = typeof atob !== 'undefined'
          ? atob(clientDataStr)
          : Buffer.from(clientDataStr, 'base64').toString('utf-8');

        clientData = JSON.parse(decodedData);
      } catch (parseError) {
        logger.warn('WebAuthn: Failed to parse clientDataJSON for authentication', parseError);
        return {
          verified: false,
          error: 'فشل في تحليل بيانات العميل',
        };
      }

      // 5. Verify type
      if (clientData.type !== 'webauthn.get') {
        logger.warn('WebAuthn: Invalid type in clientData for authentication', { type: clientData.type });
        return {
          verified: false,
          error: 'نوع العملية غير صحيح',
        };
      }

      // 6. Verify challenge matches
      if (clientData.challenge !== expectedChallenge) {
        logger.warn('WebAuthn: Challenge mismatch in authentication');
        return {
          verified: false,
          error: 'التحدي غير متطابق',
        };
      }

      // 7. Verify origin matches
      if (clientData.origin !== this.origin) {
        logger.warn('WebAuthn: Origin mismatch in authentication', {
          expected: this.origin,
          received: clientData.origin
        });
        return {
          verified: false,
          error: 'مصدر الطلب غير صحيح',
        };
      }

      // 8. Counter verification (Prevent replay attacks)
      // Note: In a full implementation, you would parse authenticatorData to extract counter
      // For now, we increment the counter to track usage
      const newCounter = credential.counter + 1;

      // TODO: Full signature verification using credential.publicKey
      // This requires implementing COSE key parsing and signature verification
      // For production, use @simplewebauthn/server library
      logger.info('WebAuthn: Authentication verified (basic validation)', {
        credentialId: credential.credentialId.substring(0, 8) + '...',
        newCounter
      });

      return {
        verified: true,
        newCounter,
      };
    } catch (error) {
      logger.error('WebAuthn authentication verification error', error, { operation: 'authentication_verification' });
      return {
        verified: false,
        error: 'فشل التحقق من المصادقة',
      };
    }
  }

  /**
   * Generate a cryptographically secure random challenge
   * Security: Uses crypto.randomBytes for server-side generation (more secure than Math.random fallback)
   */
  private generateChallenge(): string {
    // Use Node.js crypto for server-side secure random generation
    const crypto = require('crypto');
    const buffer = crypto.randomBytes(32);
    return buffer.toString('base64url');
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    } else if (typeof Buffer !== 'undefined') {
      return Buffer.from(binary, 'binary').toString('base64');
    }

    return binary;
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    let binary;

    if (typeof atob !== 'undefined') {
      binary = atob(base64);
    } else if (typeof Buffer !== 'undefined') {
      binary = Buffer.from(base64, 'base64').toString('binary');
    } else {
      binary = base64;
    }

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const webAuthnService = WebAuthnService.getInstance();

/**
 * Client-side helpers for WebAuthn
 */
export const WebAuthnClient = {
  /**
   * Check if WebAuthn is available
   */
  isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function'
    );
  },

  /**
   * Check if platform authenticator is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  /**
   * Register a new credential
   */
  async register(options: WebAuthnRegistrationOptions): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('WebAuthn is not available in this browser');
    }

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: Uint8Array.from(atob(options.challenge), (c) => c.charCodeAt(0)),
      rp: options.rp,
      user: {
        id: Uint8Array.from(options.user.id, (c) => c.charCodeAt(0)),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      authenticatorSelection: options.authenticatorSelection,
      attestation: options.attestation,
    };

    try {
      const credential = await navigator.credentials.create({ publicKey });
      return credential;
    } catch (error) {
      logger.error('WebAuthn registration error', error, { operation: 'registration' });
      throw error;
    }
  },

  /**
   * Authenticate with existing credential
   */
  async authenticate(options: WebAuthnAuthenticationOptions): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('WebAuthn is not available in this browser');
    }

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: Uint8Array.from(atob(options.challenge), (c) => c.charCodeAt(0)),
      timeout: options.timeout,
      rpId: options.rpId,
      userVerification: options.userVerification,
    };

    if (options.allowCredentials) {
      publicKey.allowCredentials = options.allowCredentials.map((cred) => ({
        type: cred.type,
        id: Uint8Array.from(atob(cred.id), (c) => c.charCodeAt(0)),
        transports: cred.transports,
      }));
    }

    try {
      const credential = await navigator.credentials.get({ publicKey });
      return credential;
    } catch (error) {
      logger.error('WebAuthn authentication error', error, { operation: 'authentication' });
      throw error;
    }
  },

  /**
   * Get supported authenticator types
   */
  async getSupportedAuthenticators(): Promise<{
    platform: boolean;
    crossPlatform: boolean;
  }> {
    const platform = await this.isPlatformAuthenticatorAvailable();

    return {
      platform,
      crossPlatform: this.isAvailable(), // Assume cross-platform is available if WebAuthn is
    };
  },
};


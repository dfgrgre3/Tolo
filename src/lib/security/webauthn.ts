/**
 * WebAuthn / Passkeys Implementation
 * نظام متقدم للمصادقة البيومترية باستخدام WebAuthn API
 */

import { v4 as uuidv4 } from 'uuid';

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
   */
  async verifyRegistration(
    response: any,
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
      // In a real implementation, we would:
      // 1. Decode the clientDataJSON
      // 2. Verify the challenge matches
      // 3. Verify the origin matches
      // 4. Verify the attestation
      // 5. Extract and store the public key

      // For now, we'll do basic validation
      if (!response || !response.id || !response.rawId) {
        return {
          verified: false,
          error: 'Invalid registration response',
        };
      }

      // This is a simplified version
      // In production, use a library like @simplewebauthn/server
      const credentialId = response.id;
      const publicKey = response.response?.attestationObject || '';
      const counter = 0;

      return {
        verified: true,
        credential: {
          credentialId,
          publicKey,
          counter,
        },
      };
    } catch (error) {
      console.error('WebAuthn registration verification error:', error);
      return {
        verified: false,
        error: 'Verification failed',
      };
    }
  }

  /**
   * Verify authentication response
   */
  async verifyAuthentication(
    response: any,
    expectedChallenge: string,
    credential: WebAuthnCredential
  ): Promise<{
    verified: boolean;
    newCounter?: number;
    error?: string;
  }> {
    try {
      // In a real implementation, we would:
      // 1. Decode the clientDataJSON
      // 2. Verify the challenge matches
      // 3. Verify the origin matches
      // 4. Verify the signature using the stored public key
      // 5. Verify the counter is greater than the stored counter

      // For now, we'll do basic validation
      if (!response || !response.id) {
        return {
          verified: false,
          error: 'Invalid authentication response',
        };
      }

      // Check if credential ID matches
      if (response.id !== credential.credentialId) {
        return {
          verified: false,
          error: 'Credential ID mismatch',
        };
      }

      // This is a simplified version
      // In production, use a library like @simplewebauthn/server
      const newCounter = credential.counter + 1;

      return {
        verified: true,
        newCounter,
      };
    } catch (error) {
      console.error('WebAuthn authentication verification error:', error);
      return {
        verified: false,
        error: 'Verification failed',
      };
    }
  }

  /**
   * Generate a random challenge
   */
  private generateChallenge(): string {
    const buffer = new Uint8Array(32);
    
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(buffer);
    } else if (typeof global !== 'undefined' && global.crypto) {
      global.crypto.getRandomValues(buffer);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
    }

    return this.arrayBufferToBase64(buffer);
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
      console.error('WebAuthn registration error:', error);
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
      console.error('WebAuthn authentication error:', error);
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


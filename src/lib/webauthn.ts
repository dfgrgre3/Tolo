'use client';

import axios from 'axios';
import { logger } from '@/lib/logger';

interface WebAuthnConfig {
  rpId: string;
  rpName: string;
  apiBaseUrl: string;
  timeout: number;
}

function getConfig(): WebAuthnConfig {
  if (typeof window === 'undefined') {
    throw new Error('WebAuthn can only be used on the client side');
  }

  return {
    rpId: window.location.hostname,
    rpName: 'Thanawy System',
    apiBaseUrl: '/api/auth/webauthn',
    timeout: 60000
  };
}

async function getRegistrationOptions(userId: string, userName: string): Promise<PublicKeyCredentialCreationOptions> {
  const config = getConfig();
  const response = await axios.post(`${config.apiBaseUrl}/options`, {
    userId,
    userName
  });
  return response.data as PublicKeyCredentialCreationOptions;
}

interface PublicKeyCredentialCreationOptions {
  challenge: BufferSource;
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntity;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  extensions?: AuthenticationExtensionsClientInputs;
}

async function createCredential(options: PublicKeyCredentialCreationOptions) {
  if (typeof window === 'undefined' || !navigator.credentials) {
    throw new Error('WebAuthn is not available');
  }
  return await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential;
}

async function verifyRegistration(credential: PublicKeyCredential, userId: string) {
  const config = getConfig();
  await axios.post(`${config.apiBaseUrl}/verify`, {
    userId,
    credential: {
      id: credential.id,
      rawId: Array.from(new Uint8Array(credential.rawId)),
      response: {
        attestationObject: Array.from(new Uint8Array(
          (credential.response as AuthenticatorAttestationResponse).attestationObject
        )),
        clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
      }
    }
  });
}

interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

async function isSupported(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return !!window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function register(userId: string, userName: string): Promise<Credential> {
  if (!await isSupported()) {
    throw new Error('المتصفح لا يدعم المصادقة البيومترية');
  }

  try {
    const options = await getRegistrationOptions(userId, userName);
    const credential = await createCredential(options);
    await verifyRegistration(credential, userId);
    return credential;
  } catch (error) {
    logger.error('فشل التسجيل:', error);
    throw new Error('فشل في عملية التسجيل البيومتري');
  }
}

async function authenticate(): Promise<AuthResult> {
  const config = getConfig();

  // 1. Get authentication options from server
  const optionsResponse = await axios.post(`${config.apiBaseUrl}/authenticate/options`);

  // 2. Get credential using browser API
  if (typeof window === 'undefined' || !navigator.credentials) {
    throw new Error('WebAuthn is not available');
  }

  const credential = await navigator.credentials.get({
    publicKey: optionsResponse.data
  }) as PublicKeyCredential;

  // 3. Verify credential with server
  const authResponse = await axios.post(`${config.apiBaseUrl}/authenticate/verify`, {
    credential
  });

  return authResponse.data;
}

export const WebAuthnService = {
  isSupported,
  register,
  authenticate
};

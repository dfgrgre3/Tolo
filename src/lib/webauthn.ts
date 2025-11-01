import axios from 'axios';

interface WebAuthnConfig {
  rpId: string;
  rpName: string;
  apiBaseUrl: string;
  timeout: number;
}

const config: WebAuthnConfig = {
  rpId: window.location.hostname,
  rpName: 'Thanawy System',
  apiBaseUrl: '/api/auth/webauthn',
  timeout: 60000
};

async function getRegistrationOptions(userId: string, userName: string) {
  const response = await axios.post(`${config.apiBaseUrl}/options`, { 
    userId, 
    userName 
  });
  return response.data;
}

async function createCredential(options: any) {
  return await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential;
}

async function verifyRegistration(credential: PublicKeyCredential, userId: string) {
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

export const WebAuthnService = {
  isSupported,
  register,
  authenticate
};

async function isSupported(): Promise<boolean> {
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
    console.error('فشل التسجيل:', error);
    throw new Error('فشل في عملية التسجيل البيومتري');
  }
}

async function authenticate(): Promise<{token: string, user: any}> {
  // 1. Get authentication options from server
  const optionsResponse = await axios.post(`${config.apiBaseUrl}/authenticate/options`);
  
  // 2. Get credential using browser API
  const credential = await navigator.credentials.get({
    publicKey: optionsResponse.data
  }) as PublicKeyCredential;

  // 3. Verify credential with server
  const authResponse = await axios.post(`${config.apiBaseUrl}/authenticate/verify`, {
    credential
  });

  return authResponse.data;
}

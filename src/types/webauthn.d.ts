interface PublicKeyCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorResponse;
  type: string;
  getClientExtensionResults(): Record<string, unknown>;
}

interface AuthenticatorResponse {
  clientDataJSON: ArrayBuffer;
}

interface AuthenticatorAttestationResponse extends AuthenticatorResponse {
  attestationObject: ArrayBuffer;
}

interface AuthenticatorAssertionResponse extends AuthenticatorResponse {
  authenticatorData: ArrayBuffer;
  signature: ArrayBuffer;
  userHandle: ArrayBuffer | null;
}

interface Window {
  PublicKeyCredential?: {
    isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean>;
  };
}

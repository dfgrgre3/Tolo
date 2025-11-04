/**
 * Unified OAuth Providers Configuration
 * تكوين موحد لجميع مزودي OAuth
 */

export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  clientId?: string;
  clientSecret?: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  enabled: boolean;
}

export const oauthProviders: Record<string, OAuthProvider> = {
  google: {
    id: 'google',
    name: 'Google',
    icon: '🔍',
    color: '#4285F4',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['openid', 'email', 'profile'],
    enabled: !!process.env.GOOGLE_CLIENT_ID,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v18.0/me?fields=id,name,email',
    scopes: ['email', 'public_profile'],
    enabled: !!process.env.FACEBOOK_CLIENT_ID,
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    icon: '🪟',
    color: '#0078D4',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    scopes: ['openid', 'email', 'profile'],
    enabled: !!process.env.MICROSOFT_CLIENT_ID,
  },
  github: {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    color: '#24292E',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email'],
    enabled: !!process.env.GITHUB_CLIENT_ID,
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    icon: '🍎',
    color: '#000000',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    userInfoUrl: 'https://appleid.apple.com/auth/userinfo',
    scopes: ['email', 'name'],
    enabled: !!process.env.APPLE_CLIENT_ID,
  },
};

/**
 * Get enabled OAuth providers
 */
export function getEnabledProviders(): OAuthProvider[] {
  return Object.values(oauthProviders).filter((provider) => provider.enabled);
}

/**
 * Get OAuth provider by ID
 */
export function getProvider(providerId: string): OAuthProvider | null {
  return oauthProviders[providerId] || null;
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(
  providerId: string,
  redirectUri: string,
  state: string
): string | null {
  const provider = getProvider(providerId);
  if (!provider || !provider.enabled) return null;

  const params = new URLSearchParams({
    client_id: provider.clientId || (process.env[`${providerId.toUpperCase()}_CLIENT_ID`] as string) || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state,
  });

  // Apple requires additional parameters
  if (providerId === 'apple') {
    params.append('response_mode', 'form_post');
  }

  return `${provider.authUrl}?${params.toString()}`;
}

/**
 * Get redirect URI for provider
 */
export function getRedirectUri(providerId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/auth/${providerId}/callback`;
}


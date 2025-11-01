interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

export class OAuthService {
  private providers: Record<string, OAuthProvider>;

  constructor() {
    this.providers = {
      google: {
        id: 'google',
        name: 'Google',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
      },
      microsoft: {
        id: 'microsoft',
        name: 'Microsoft',
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo'
      }
    };
  }

  getAuthUrl(providerId: string, redirectUri: string): string {
    const provider = this.providers[providerId];
    if (!provider) throw new Error('Provider not found');
    
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: this.generateState()
    });
    
    return `${provider.authUrl}?${params.toString()}`;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async getUserInfo(providerId: string, code: string): Promise<any> {
    // Implementation for exchanging code for token and getting user info
    return {};
  }
}

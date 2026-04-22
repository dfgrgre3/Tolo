import prisma from '@/lib/db';
import { SessionService } from './session-service';
import { SecurityLogger } from './security-logger';
import { logger } from '@/lib/logger';
import { emailService } from '@/services/email-service';

export interface OAuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export class OAuthService {
  /**
   * Get Google Authorization URL
   */
  static getGoogleAuthUrl(redirectUri: string) {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'].
      join(' ')
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  /**
   * Get Github Authorization URL
   */
  static getGithubAuthUrl(redirectUri: string) {
    const rootUrl = 'https://github.com/login/oauth/authorize';
    const options = {
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state: 'random_state_here' // In prod, use a secure CSRF state
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  /**
   * Exchange code for Google User
   */
  static async getGoogleUser(code: string, redirectUri: string): Promise<OAuthUser | null> {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokens = await tokenResponse.json();
      if (!tokens.access_token) return null;

      const userResponse = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });

      const user = await userResponse.json();
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.picture
      };
    } catch (error: any) {
      logger.error('[OAUTH_GOOGLE_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });
      return null;
    }
  }

  /**
   * Exchange code for Github User
   */
  static async getGithubUser(code: string): Promise<OAuthUser | null> {
    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code
        })
      });

      const tokens = await tokenResponse.json();
      if (!tokens.access_token) return null;

      const userResponse = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${tokens.access_token}` }
      });

      const user = await userResponse.json();

      // Get primary email
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${tokens.access_token}` }
      });

      interface GithubEmail {
        email: string;
        primary: boolean;
        verified: boolean;
        visibility: string | null;
      }

      const emails: GithubEmail[] = await emailResponse.json();
      const primaryEmail = emails.find((e: GithubEmail) => e.primary)?.email || (user as any).email;

      return {
        id: user.id.toString(),
        email: primaryEmail,
        name: user.name || user.login,
        avatar: user.avatar_url
      };
    } catch (error: any) {
      logger.error('[OAUTH_GITHUB_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });
      return null;
    }
  }

  /**
   * Handle Social Auth (Find or Create User and create Session)
   */
  static async handleSocialAuth(
  provider: 'google' | 'github',
  socialUser: OAuthUser,
  ip: string,
  userAgent: string,
  location?: string)
  {
    try {
      // 1. Find user by provider ID or email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
          { [provider === 'google' ? 'googleId' : 'githubId']: socialUser.id },
          { email: socialUser.email.toLowerCase() }]

        }
      });

      if (!user) {
        // 2. Create new user if not exists
        user = await prisma.user.create({
          data: {
            email: socialUser.email.toLowerCase(),
            name: socialUser.name,
            username: socialUser.email.split('@')[0] + '_' + Math.random().toString(36).slice(-4),
            avatar: socialUser.avatar,
            [provider === 'google' ? 'googleId' : 'githubId']: socialUser.id,
            emailVerified: true,
            passwordHash: 'OAUTH_USER_' + Math.random().toString(36), // Dummy password
            role: 'STUDENT'
          }
        });
      } else {
        // 3. Update existing user if missing provider ID
        const providerField = provider === 'google' ? 'googleId' : 'githubId';
        if (!user[providerField as keyof typeof user]) {
          await prisma.user.update({
            where: { id: user.id },
            data: { [providerField]: socialUser.id }
          });
        }
      }

      // 4. Create Session
      const { session, accessToken, refreshToken } = await SessionService.createSession(
        user.id,
        user.role,
        ip,
        userAgent,
        true,
        location
      );

      // 5. Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      await SecurityLogger.logLogin(user.id, ip, userAgent, session.id);

      // Send Security Alert (Optional: could add logic to check if new device)
      await emailService.sendLoginAlert(user.email, {
        ip,
        device: userAgent,
        time: new Date().toLocaleString('ar-EG')
      });

      return {
        success: true,
        user,
        accessToken,
        refreshToken,
        sessionId: session.id
      };

    } catch (error: any) {
      logger.error('[OAUTH_HANDLE_SOCIAL_AUTH_ERROR]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        error
      });
      return { success: false, error: 'Internal Server Error' };
    }
  }
}
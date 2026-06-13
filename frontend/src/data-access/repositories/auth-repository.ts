import { authClient } from '@/data-access/rpc-client';

export interface UserProfile {
  email: string;
  role: string;
}

export const authRepository = {
  async getProfile(headers?: Record<string, string>): Promise<UserProfile> {
    const profile = await authClient.getProfile({}, { headers });
    return {
      email: profile.user?.email || '',
      role: profile.user?.role || '',
    };
  }
};

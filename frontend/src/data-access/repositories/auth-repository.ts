import { authClient } from '@/data-access/rpc-client';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
}

export const authRepository = {
  async getProfile(headers?: Record<string, string>): Promise<UserProfile> {
    const profile = await authClient.getProfile({}, { headers });
    return {
      id: profile.user?.id || '',
      email: profile.user?.email || '',
      role: profile.user?.role || '',
    };
  }
};

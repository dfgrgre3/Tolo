import { authClient } from '@/lib/rpc-client';

export interface UserProfile {
  email: string;
  role: string;
}

export const authRepository = {
  async getProfile(): Promise<UserProfile> {
    const profile = await authClient.getProfile({});
    return {
      email: profile.user?.email || '',
      role: profile.user?.role || '',
    };
  }
};

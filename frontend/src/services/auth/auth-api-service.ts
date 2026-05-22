import { apiRoutes } from '@/lib/api/routes';

export const authApiService = {
  async forgotPassword(email: string): Promise<{success: boolean; error?: string; message?: string;}> {
    try {
      const res = await fetch(apiRoutes.auth.forgotPassword, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await res.json();
      return { success: res.ok, ...data };
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<{success: boolean; error?: string;}> {
    try {
      const res = await fetch(apiRoutes.auth.resetPassword, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      return { success: res.ok, ...data };
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  async verifyEmail(token: string): Promise<{success: boolean; error?: string;}> {
    try {
      const res = await fetch(`${apiRoutes.auth.verifyEmail}?token=${token}`);
      const data = await res.json();
      return { success: res.ok, ...data };
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  async resendVerification(email: string): Promise<{success: boolean; error?: string;}> {
    try {
      const res = await fetch(apiRoutes.auth.resendVerification, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await res.json();
      return { success: res.ok, ...data };
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  async requestMagicLink(email: string): Promise<{success: boolean; error?: string;}> {
    try {
      const res = await fetch(apiRoutes.auth.magicLink.request, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await res.json();
      return { success: res.ok, ...data };
    } catch {
      return { success: false, error: 'Network error' };
    }
  },
};

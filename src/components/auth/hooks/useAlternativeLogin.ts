/**
 * Custom hook for alternative login methods (passkey, test account)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { logger } from '@/lib/logger';
import { getRedirectPath, clearStoredRedirect } from '../utils/login-form.utils';
import { getPasskeyAuthenticationOptions, verifyPasskeyAuthentication } from '@/lib/api/auth-client';
import { getPasskeyManager } from '../passkeys/PasskeyManager';

export const useAlternativeLogin = () => {
  const router = useRouter();
  const { login: unifiedLogin } = useUnifiedAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle passkey login
   */
  const handlePasskeyLogin = async () => {
    const passkeyManager = getPasskeyManager();
    if (!passkeyManager.isSupported()) {
      toast.error('المصادقة بمفاتيح المرور غير مدعومة في هذا المتصفح');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Get authentication options from the server
      const options = await getPasskeyAuthenticationOptions();

      // 2. Use PasskeyManager to authenticate with the browser
      const authenticationResponse = await passkeyManager.authenticateWithPasskey(options);

      // 3. Verify the authentication response with the server
      const data = await verifyPasskeyAuthentication(authenticationResponse);

      if (!data.token) {
        throw new Error('فشل الحصول على رمز الدخول');
      }

      // 4. Handle successful login
      await unifiedLogin(data.token, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name ?? undefined,
        role: data.user.role || 'user',
        emailVerified: data.user.emailVerified || false,
        twoFactorEnabled: data.user.twoFactorEnabled || false,
      });

      toast.success('تم تسجيل الدخول بنجاح!');
      const redirectPath = getRedirectPath();
      clearStoredRedirect();
      router.replace(redirectPath);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشلت المصادقة باستخدام مفتاح المرور';
      // Check for cancellation error
      if (errorMessage === 'تم إلغاء عملية المصادقة') {
        toast.info('تم إلغاء عملية المصادقة');
        return;
      }

      toast.error(errorMessage);
      logger.error('Passkey login error:', error);
    } finally {
      setIsLoading(false);
    }
  };



  return {
    isLoading,
    handlePasskeyLogin,
  };
};


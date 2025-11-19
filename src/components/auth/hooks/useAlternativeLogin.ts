/**
 * Custom hook for alternative login methods (biometric, test account)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { logger } from '@/lib/logger';
import { safeWindow } from '@/lib/safe-client-utils';
import { getRedirectPath, clearStoredRedirect } from '../utils/login-form.utils';
import { 
  getBiometricChallenge, 
  verifyBiometric, 
  loginUser, 
  createTestAccount 
} from '@/lib/api/auth-client';

export const useAlternativeLogin = () => {
  const router = useRouter();
  const { login: unifiedLogin } = useUnifiedAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle biometric login
   */
  const handleBiometricLogin = async () => {
    const hasPublicKeyCredential = safeWindow((w) => !!w.PublicKeyCredential, false);
    if (!hasPublicKeyCredential) {
      toast.error('المصادقة البيومترية غير مدعومة في هذا المتصفح');
      return;
    }

    setIsLoading(true);

    try {
      // Create an AbortController for timeout
      const challengeController = new AbortController();
      const challengeTimeout = setTimeout(() => challengeController.abort(), 30000);

      let challenge: string;

      try {
        const challengeData = await getBiometricChallenge({ type: 'authenticate' });
        challenge = challengeData.challenge;
        clearTimeout(challengeTimeout);
      } catch (fetchError: unknown) {
        clearTimeout(challengeTimeout);

        const error =
          fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          toast.error(
            'انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
            { duration: 5000 }
          );
          setIsLoading(false);
          return;
        }

        if (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          toast.error(
            'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
            { duration: 5000 }
          );
          setIsLoading(false);
          return;
        }

        toast.error(error.message || 'فشلت المصادقة البيومترية', { duration: 5000 });
        setIsLoading(false);
        return;
      }

      // Request credential
      let credential: PublicKeyCredential | null = null;
      try {
        credential = (await navigator.credentials.get({
          publicKey: {
            challenge: Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0)),
            timeout: 60000,
            userVerification: 'required',
          },
        })) as PublicKeyCredential | null;

        if (!credential) {
          toast.error('فشلت المصادقة البيومترية');
          setIsLoading(false);
          return;
        }
      } catch (credError: unknown) {
        const error =
          credError instanceof Error ? credError : new Error(String(credError));
        if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
          toast.error('تم إلغاء المصادقة البيومترية أو غير مدعومة');
        } else {
          toast.error('فشلت المصادقة البيومترية');
        }
        setIsLoading(false);
        return;
      }

      // Verify credential
      try {
        const data = await verifyBiometric({
          credential,
          challenge,
        });

        try {
          await unifiedLogin(data.token, {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name ?? undefined,
            role: data.user.role || 'user',
            emailVerified: data.user.emailVerified || false,
            twoFactorEnabled: data.user.twoFactorEnabled || false,
          });
          toast.success('تم تسجيل الدخول بنجاح!');
          setIsLoading(false);

          const redirectPath = getRedirectPath();
          clearStoredRedirect();

          setTimeout(() => {
            router.replace(redirectPath);
          }, 500);
        } catch (loginError) {
          logger.error('Error in login function:', loginError);
          toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
          setIsLoading(false);
        }
      } catch (verifyError: unknown) {
        const error =
          verifyError instanceof Error ? verifyError : new Error(String(verifyError));
        const errorMessage = (verifyError as any)?.error || error.message || 'فشلت المصادقة';
        
        if (
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          !navigator.onLine
        ) {
          toast.error(
            'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
            { duration: 5000 }
          );
          setIsLoading(false);
          return;
        }

        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Biometric login error:', error);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.name === 'TypeError' ||
        !navigator.onLine
      ) {
        toast.error(
          'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
          { duration: 5000 }
        );
      } else {
        toast.error(err.message || 'فشلت المصادقة البيومترية');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle test account login
   */
  const handleTestAccountLogin = async () => {
    setIsLoading(true);
    try {
      try {
        const loginData = await loginUser({
          email: 'test@example.com',
          password: 'Test123!@#',
          rememberMe: true,
        });

        if (loginData.token && loginData.user) {
          await unifiedLogin(loginData.token, {
            id: loginData.user.id,
            email: loginData.user.email,
            name: loginData.user.name ?? undefined,
            role: loginData.user.role || 'user',
            emailVerified: loginData.user.emailVerified || false,
            twoFactorEnabled: loginData.user.twoFactorEnabled || false,
          });
          toast.success('تم تسجيل الدخول بحساب تجريبي!', { duration: 3000 });
          const redirectPath = getRedirectPath();
          clearStoredRedirect();
          router.push(redirectPath);
          router.refresh();
          setIsLoading(false);
          return;
        }
      } catch (loginError: any) {
        // If login fails, try to create the test account first
        if (loginError?.code === 'UNAUTHORIZED' || loginError?.status === 401) {
          toast.info('جارٍ إنشاء الحساب التجريبي...', { duration: 2000 });

          try {
            await createTestAccount();

            // Retry login after creating account
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const retryData = await loginUser({
              email: 'test@example.com',
              password: 'Test123!@#',
              rememberMe: true,
            });

            if (retryData.token && retryData.user) {
              await unifiedLogin(retryData.token, {
                id: retryData.user.id,
                email: retryData.user.email,
                name: retryData.user.name ?? undefined,
                role: retryData.user.role || 'user',
                emailVerified: retryData.user.emailVerified || false,
                twoFactorEnabled: retryData.user.twoFactorEnabled || false,
              });
              toast.success('تم تسجيل الدخول بحساب تجريبي!', { duration: 3000 });
              const redirectPath = getRedirectPath();
              clearStoredRedirect();
              router.push(redirectPath);
              router.refresh();
              setIsLoading(false);
              return;
            }
          } catch (createError) {
            logger.error('Failed to create test account:', createError);
          }

          toast.error('فشل تسجيل الدخول بالحساب التجريبي. يرجى المحاولة يدوياً.');
          setIsLoading(false);
          return;
        }

        const errorMessage = loginError?.error || 'حدث خطأ أثناء تسجيل الدخول';
        toast.error(errorMessage);
      }
    } catch (error) {
      logger.error('Test account login error:', error);
      toast.error('حدث خطأ أثناء تسجيل الدخول بالحساب التجريبي');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleBiometricLogin,
    handleTestAccountLogin,
  };
};


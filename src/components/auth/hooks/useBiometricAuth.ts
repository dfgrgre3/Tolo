'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function useBiometricAuth() {
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = () => {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential;
  };

  const authenticate = async (): Promise<{
    token: string;
    user: any;
  }> => {
    if (!isSupported()) {
      throw new Error('المصادقة البيومترية غير مدعومة في هذا المتصفح');
    }

    setIsLoading(true);

    try {
      // Get challenge
      const challengeController = new AbortController();
      const challengeTimeout = setTimeout(
        () => challengeController.abort(),
        30000
      );

      let challengeResponse: Response;
      let challenge: string;

      try {
        challengeResponse = await fetch('/api/auth/biometric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'authenticate' }),
          signal: challengeController.signal,
        });

        clearTimeout(challengeTimeout);

        const contentType = challengeResponse.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!challengeResponse.ok) {
          if (isJson) {
            const errorData = await challengeResponse.json();
            throw new Error(errorData.error || `خطأ في الاتصال: ${challengeResponse.status}`);
          } else {
            const status = challengeResponse.status;
            throw new Error(
              status === 404
                ? 'المصادقة البيومترية غير متاحة حالياً.'
                : status >= 500
                ? 'خطأ في الخادم. يرجى المحاولة لاحقاً.'
                : `خطأ في الخادم (${status})`
            );
          }
        }

        if (!isJson) {
          throw new Error('استجابة غير صحيحة من الخادم.');
        }

        const challengeData = await challengeResponse.json();
        challenge = challengeData.challenge;
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          throw new Error('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
        }

        if (
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          throw new Error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
        }

        throw fetchError;
      }

      // Request credential
      let credential: any;
      try {
        credential = await navigator.credentials.get({
          publicKey: {
            challenge: Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0)),
            timeout: 60000,
            userVerification: 'required',
          },
        });

        if (!credential) {
          throw new Error('فشلت المصادقة البيومترية');
        }
      } catch (credError: any) {
        if (credError.name === 'NotAllowedError' || credError.name === 'NotSupportedError') {
          throw new Error('تم إلغاء المصادقة البيومترية أو غير مدعومة');
        } else {
          throw new Error('فشلت المصادقة البيومترية');
        }
      }

      // Verify credential
      const verifyController = new AbortController();
      const verifyTimeout = setTimeout(() => verifyController.abort(), 30000);

      try {
        const verifyResponse = await fetch('/api/auth/biometric/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential,
            challenge,
          }),
          signal: verifyController.signal,
        });

        clearTimeout(verifyTimeout);

        const contentType = verifyResponse.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!verifyResponse.ok) {
          if (isJson) {
            const errorData = await verifyResponse.json();
            throw new Error(errorData.error || `خطأ في الاتصال: ${verifyResponse.status}`);
          } else {
            const status = verifyResponse.status;
            throw new Error(
              status === 404
                ? 'المصادقة البيومترية غير متاحة حالياً.'
                : status >= 500
                ? 'خطأ في الخادم. يرجى المحاولة لاحقاً.'
                : `خطأ في الخادم (${status})`
            );
          }
        }

        if (!isJson) {
          throw new Error('استجابة غير صحيحة من الخادم.');
        }

        const data = await verifyResponse.json();

        if (!data.token || !data.user) {
          throw new Error('استجابة غير صحيحة من الخادم.');
        }

        return {
          token: data.token,
          user: data.user,
        };
      } catch (verifyError: any) {
        clearTimeout(verifyTimeout);

        if (verifyError.name === 'AbortError' || verifyError.message?.includes('aborted')) {
          throw new Error('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
        }

        if (
          verifyError.message?.includes('Failed to fetch') ||
          verifyError.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          throw new Error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
        }

        throw verifyError;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isSupported,
    authenticate,
  };
}


'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Shield } from 'lucide-react';

interface CaptchaWidgetProps {
  siteKey?: string;
  provider?: 'hcaptcha' | 'recaptcha';
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
}

export function CaptchaWidget({
  siteKey,
  provider = 'hcaptcha',
  onVerify,
  onError,
  theme = 'dark',
  size = 'normal',
}: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      setIsLoading(false);
      setError('مفتاح CAPTCHA غير متوفر');
      return;
    }

    // Load CAPTCHA script
    const scriptId = `${provider}-script`;
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      
      if (provider === 'hcaptcha') {
        script.src = 'https://js.hcaptcha.com/1/api.js';
        script.async = true;
        script.defer = true;
      } else if (provider === 'recaptcha') {
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.defer = true;
      }

      script.onload = () => {
        renderWidget();
      };

      script.onerror = () => {
        setIsLoading(false);
        const errorMsg = 'فشل تحميل CAPTCHA';
        setError(errorMsg);
        onError?.(errorMsg);
      };

      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    function renderWidget() {
      if (!containerRef.current || !siteKey) return;

      try {
        if (provider === 'hcaptcha') {
          // @ts-ignore - hCaptcha is loaded dynamically
          if (window.hcaptcha) {
            widgetRef.current = window.hcaptcha.render(containerRef.current, {
              sitekey: siteKey,
              theme,
              size,
              callback: (token: string) => {
                setIsLoading(false);
                onVerify(token);
              },
              'error-callback': (err: any) => {
                setIsLoading(false);
                const errorMsg = 'فشل التحقق من CAPTCHA';
                setError(errorMsg);
                onError?.(errorMsg);
              },
            });
            setIsLoading(false);
          }
        } else if (provider === 'recaptcha') {
          // @ts-ignore - reCAPTCHA is loaded dynamically
          if (window.grecaptcha) {
            widgetRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              theme,
              size,
              callback: (token: string) => {
                setIsLoading(false);
                onVerify(token);
              },
              'error-callback': () => {
                setIsLoading(false);
                const errorMsg = 'فشل التحقق من CAPTCHA';
                setError(errorMsg);
                onError?.(errorMsg);
              },
            });
            setIsLoading(false);
          }
        }
      } catch (err) {
        setIsLoading(false);
        const errorMsg = 'خطأ في تهيئة CAPTCHA';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    }

    // Cleanup
    return () => {
      if (widgetRef.current && provider === 'hcaptcha') {
        try {
          // @ts-ignore
          window.hcaptcha?.reset(widgetRef.current);
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    };
  }, [siteKey, provider, theme, size, onVerify, onError]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-red-400" />
        <div className="text-sm text-red-300">
          <p className="font-semibold">خطأ في CAPTCHA</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Shield className="h-4 w-4" />
        <span>تحقق من أنك لست روبوتاً</span>
      </div>
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        </div>
      )}
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}

// Type declarations for CAPTCHA libraries
declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      execute: (widgetId: string) => void;
    };
    grecaptcha?: {
      render: (container: HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      execute: (widgetId: string) => Promise<string>;
    };
  }
}


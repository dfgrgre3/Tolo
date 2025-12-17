'use client';

/**
 * 🛡️ InvisibleCaptcha - CAPTCHA غير مرئي
 * 
 * يعمل في الخلفية دون إزعاج المستخدم
 * يظهر التحدي فقط عند الشك
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle } from 'lucide-react';

// Provider types
type CaptchaProvider = 'recaptcha_v3' | 'turnstile';

interface InvisibleCaptchaProps {
  /** المزود المستخدم */
  provider?: CaptchaProvider;
  /** مفتاح الموقع */
  siteKey?: string;
  /** اسم الإجراء (للتتبع) */
  action?: string;
  /** callback عند الحصول على التوكن */
  onToken: (token: string) => void;
  /** callback عند الخطأ */
  onError?: (error: string) => void;
  /** callback عند انتهاء صلاحية التوكن */
  onExpire?: () => void;
  /** إظهار مؤشر التحقق */
  showIndicator?: boolean;
  /** تأخير التحميل */
  delay?: number;
}

// Turnstile types
interface RecaptchaV3 {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

interface CustomWindow {
  turnstile?: {
    render: (container: string | HTMLElement, options: TurnstileOptions) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
    getResponse: (widgetId: string) => string | undefined;
  };
  grecaptcha?: RecaptchaV3;
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: (error: string) => void;
  'expired-callback'?: () => void;
  size?: 'normal' | 'compact' | 'invisible';
  theme?: 'light' | 'dark' | 'auto';
  action?: string;
}

// Get config from environment
function getDefaultConfig() {
  const provider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || 'recaptcha_v3') as CaptchaProvider;
  
  return {
    provider,
    siteKey: provider === 'recaptcha_v3' 
      ? process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY || ''
      : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
  };
}

export function InvisibleCaptcha({
  provider: propProvider,
  siteKey: propSiteKey,
  action = 'submit',
  onToken,
  onError,
  onExpire,
  showIndicator = false,
  delay = 0,
}: InvisibleCaptchaProps) {
  const defaults = getDefaultConfig();
  const provider = propProvider || defaults.provider;
  const siteKey = propSiteKey || defaults.siteKey;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const turnstileWidgetId = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // reCAPTCHA v3 execute
  const executeRecaptcha = useCallback(async () => {
    const customWindow = window as unknown as CustomWindow;
    if (!customWindow.grecaptcha || !siteKey) {
      onError?.('reCAPTCHA not loaded');
      return;
    }

    setIsVerifying(true);
    setStatus('verifying');

    try {
      const token = await customWindow.grecaptcha.execute(siteKey, { action });
      setStatus('success');
      onToken(token);
    } catch (error) {
      setStatus('error');
      onError?.(error instanceof Error ? error.message : 'reCAPTCHA error');
    } finally {
      setIsVerifying(false);
    }
  }, [siteKey, action, onToken, onError]);

  // Turnstile render
  const renderTurnstile = useCallback(() => {
    const customWindow = window as unknown as CustomWindow;
    if (!customWindow.turnstile || !containerRef.current || !siteKey) {
      return;
    }

    // Remove existing widget
    if (turnstileWidgetId.current) {
      customWindow.turnstile.remove(turnstileWidgetId.current);
    }

    turnstileWidgetId.current = customWindow.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      size: 'invisible',
      action,
      callback: (token: string) => {
        setStatus('success');
        onToken(token);
      },
      'error-callback': (error: string) => {
        setStatus('error');
        onError?.(error);
      },
      'expired-callback': () => {
        setStatus('idle');
        onExpire?.();
      },
    });
  }, [siteKey, action, onToken, onError, onExpire]);

  // Handle script load
  const handleScriptLoad = useCallback(() => {
    setTimeout(() => {
      setIsLoaded(true);

      const customWindow = window as unknown as CustomWindow;
      if (provider === 'recaptcha_v3') {
        customWindow.grecaptcha?.ready(() => {
          // Auto-execute on load
          executeRecaptcha();
        });
      } else if (provider === 'turnstile') {
        renderTurnstile();
      }
    }, delay);
  }, [provider, delay, executeRecaptcha, renderTurnstile]);

  // Cleanup
  useEffect(() => {
    return () => {
      const customWindow = window as unknown as CustomWindow;
      if (turnstileWidgetId.current && customWindow.turnstile) {
        customWindow.turnstile.remove(turnstileWidgetId.current);
      }
    };
  }, []);

  // Don't render if no siteKey
  if (!siteKey) {
    return null;
  }

  const scriptSrc = provider === 'recaptcha_v3'
    ? `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    : 'https://challenges.cloudflare.com/turnstile/v0/api.js';

  return (
    <>
      {/* Script */}
      <Script
        id={`captcha-${provider}`}
        src={scriptSrc}
        strategy="lazyOnload"
        onLoad={handleScriptLoad}
        onError={() => onError?.('Failed to load CAPTCHA script')}
      />

      {/* Turnstile container (invisible) */}
      {provider === 'turnstile' && (
        <div 
          ref={containerRef} 
          className="absolute opacity-0 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Status Indicator */}
      {showIndicator && (
        <AnimatePresence>
          {(isVerifying || status !== 'idle') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed bottom-4 right-4 z-50"
            >
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-full shadow-lg
                ${status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'}
              `}>
                {status === 'success' ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-sm">تم التحقق</span>
                  </>
                ) : status === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">خطأ في التحقق</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-sm">جاري التحقق...</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

// Hook for programmatic CAPTCHA execution
export function useInvisibleCaptcha(
  provider: CaptchaProvider = 'recaptcha_v3',
  siteKey?: string
) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const defaults = getDefaultConfig();
  const finalSiteKey = siteKey || defaults.siteKey;

  // Check if script is loaded
  useEffect(() => {
    const checkReady = () => {
      const customWindow = window as unknown as CustomWindow;
      if (provider === 'recaptcha_v3' && customWindow.grecaptcha) {
        setIsReady(true);
      } else if (provider === 'turnstile' && customWindow.turnstile) {
        setIsReady(true);
      }
    };

    // Check immediately and periodically
    checkReady();
    const interval = setInterval(checkReady, 100);
    
    return () => clearInterval(interval);
  }, [provider]);

  // Execute CAPTCHA
  const execute = useCallback(async (action: string = 'submit'): Promise<string | null> => {
    setError(null);

    if (provider === 'recaptcha_v3') {
      const customWindow = window as unknown as CustomWindow;
      if (!customWindow.grecaptcha) {
        setError('reCAPTCHA not loaded');
        return null;
      }

      try {
        const newToken = await customWindow.grecaptcha.execute(finalSiteKey, { action });
        setToken(newToken);
        return newToken;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'CAPTCHA error';
        setError(message);
        return null;
      }
    }

    // For Turnstile, we need a container
    setError('Turnstile requires component render');
    return null;
  }, [provider, finalSiteKey]);

  const reset = useCallback(() => {
    setToken(null);
    setError(null);
  }, []);

  return {
    token,
    error,
    isReady,
    execute,
    reset,
  };
}

export default InvisibleCaptcha;

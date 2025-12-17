'use client';

/**
 * 🔑 PasskeyLoginButton - زر تسجيل الدخول بالـ Passkey
 * 
 * يوفر زر جاهز للمصادقة بالـ Passkeys
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fingerprint, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePasskeyAuthentication } from '../hooks/usePasskeyAuthentication';
import { getSyncedPasskeyService } from './SyncedPasskeyService';

interface PasskeyLoginButtonProps {
  onSuccess?: (token: string, userHandle?: string) => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  useDiscoverable?: boolean;
  className?: string;
  disabled?: boolean;
}

export function PasskeyLoginButton({
  onSuccess,
  onError,
  variant = 'default',
  size = 'md',
  showLabel = true,
  useDiscoverable = true,
  className,
  disabled = false,
}: PasskeyLoginButtonProps) {
  const {
    isSupported,
    isPlatformSupported,
    isSyncedPasskeysSupported,
    isLoading: capabilitiesLoading,
    authenticateWithPasskey,
    authenticateWithDiscoverable,
  } = usePasskeyAuthentication();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncProvider, setSyncProvider] = useState<string>('');

  // Detect sync provider
  useEffect(() => {
    const service = getSyncedPasskeyService();
    const provider = service.detectSyncProvider();
    const providerName = service.getSyncProviderName(provider);
    setSyncProvider(providerName.ar);
  }, []);

  const handleClick = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      let result: { token: string; userHandle?: string } | null = null;

      if (useDiscoverable && isSyncedPasskeysSupported) {
        // Use discoverable credential (passwordless)
        const discoverableResult = await authenticateWithDiscoverable();
        if (discoverableResult) {
          result = {
            token: discoverableResult.token,
            userHandle: discoverableResult.userHandle,
          };
        }
      } else {
        // Use traditional passkey authentication
        const token = await authenticateWithPasskey();
        if (token) {
          result = { token };
        }
      }

      if (result) {
        setStatus('success');
        onSuccess?.(result.token, result.userHandle);
      } else {
        throw new Error('المصادقة فشلت');
      }
    } catch (error: unknown) {
      setStatus('error');
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'فشل في المصادقة';
      setErrorMessage(message);
      onError?.(message);

      // Reset after delay
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage(null);
      }, 3000);
    }
  }, [
    useDiscoverable,
    isSyncedPasskeysSupported,
    authenticateWithDiscoverable,
    authenticateWithPasskey,
    onSuccess,
    onError,
  ]);

  // Not supported
  if (!isSupported || (!isPlatformSupported && !capabilitiesLoading)) {
    return null;
  }

  // Loading capabilities
  if (capabilitiesLoading) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn('opacity-50', className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Size styles
  const sizeStyles = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  // Icon size
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  // Premium variant styles
  const premiumStyles = variant === 'premium'
    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300'
    : '';

  return (
    <div className={cn('relative', className)}>
      <Button
        onClick={handleClick}
        disabled={disabled || status === 'loading'}
        variant={variant === 'premium' ? 'default' : variant}
        className={cn(
          sizeStyles[size],
          premiumStyles,
          'relative overflow-hidden group',
          status === 'success' && 'bg-green-600 hover:bg-green-600',
          status === 'error' && 'bg-red-600 hover:bg-red-600',
        )}
      >
        {/* Animated background for premium */}
        {variant === 'premium' && status === 'idle' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/20 to-pink-400/0"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {status === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2 className={cn(iconSize[size], 'animate-spin')} />
              {showLabel && <span>جاري التحقق...</span>}
            </motion.div>
          ) : status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <CheckCircle className={iconSize[size]} />
              {showLabel && <span>تم التحقق!</span>}
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <XCircle className={iconSize[size]} />
              {showLabel && <span>فشل</span>}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Fingerprint className={cn(iconSize[size], 'group-hover:scale-110 transition-transform')} />
              {showLabel && (
                <span className="flex items-center gap-1.5">
                  تسجيل الدخول ببصمة الوجه/الإصبع
                  {isSyncedPasskeysSupported && variant === 'premium' && (
                    <Sparkles className="h-3 w-3 text-yellow-300" />
                  )}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Sync provider hint */}
      {isSyncedPasskeysSupported && syncProvider && status === 'idle' && showLabel && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-muted-foreground text-center mt-1.5 flex items-center justify-center gap-1"
        >
          <Smartphone className="h-3 w-3" />
          <span>متزامن عبر {syncProvider}</span>
        </motion.p>
      )}

      {/* Error tooltip */}
      {errorMessage && status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 left-0 right-0 text-center"
        >
          <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
            {errorMessage}
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default PasskeyLoginButton;

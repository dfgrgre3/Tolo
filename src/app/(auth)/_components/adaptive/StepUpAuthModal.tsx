'use client';

/**
 * 🛡️ StepUpAuthModal - نافذة التحقق الإضافي
 * 
 * تظهر عندما يتطلب النظام تحققاً إضافياً
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Mail,
  Smartphone,
  Key,
  Fingerprint,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StepUpMethod, RiskAssessment, RiskLevel } from '@/lib/security/adaptive/types';

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  riskAssessment: RiskAssessment;
  availableMethods: StepUpMethod[];
  userEmail?: string;
  userPhone?: string;
  sessionId: string;
}

// Method icons and labels
const methodConfig: Record<StepUpMethod, {
  icon: typeof Mail;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
}> = {
  email_otp: {
    icon: Mail,
    label: 'Email Code',
    labelAr: 'رمز البريد',
    description: 'We\'ll send a code to your email',
    descriptionAr: 'سنرسل رمزاً إلى بريدك الإلكتروني',
  },
  sms_otp: {
    icon: Smartphone,
    label: 'SMS Code',
    labelAr: 'رمز SMS',
    description: 'We\'ll send a code to your phone',
    descriptionAr: 'سنرسل رمزاً إلى هاتفك',
  },
  whatsapp_otp: {
    icon: Smartphone,
    label: 'WhatsApp Code',
    labelAr: 'رمز واتساب',
    description: 'We\'ll send a code via WhatsApp',
    descriptionAr: 'سنرسل رمزاً عبر واتساب',
  },
  totp: {
    icon: Key,
    label: 'Authenticator App',
    labelAr: 'تطبيق المصادقة',
    description: 'Enter code from your authenticator app',
    descriptionAr: 'أدخل الرمز من تطبيق المصادقة',
  },
  passkey_reauth: {
    icon: Fingerprint,
    label: 'Biometrics',
    labelAr: 'المقاييس الحيوية',
    description: 'Use Face ID or fingerprint',
    descriptionAr: 'استخدم بصمة الوجه أو الإصبع',
  },
  security_questions: {
    icon: Shield,
    label: 'Security Questions',
    labelAr: 'أسئلة الأمان',
    description: 'Answer your security questions',
    descriptionAr: 'أجب على أسئلة الأمان',
  },
  manual_review: {
    icon: Shield,
    label: 'Manual Review',
    labelAr: 'مراجعة يدوية',
    description: 'Your request is under review',
    descriptionAr: 'طلبك قيد المراجعة',
  },
};

// Risk level colors
const riskColors: Record<RiskLevel, string> = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

export function StepUpAuthModal({
  isOpen,
  onClose,
  onSuccess,
  riskAssessment,
  availableMethods,
  userEmail,
  userPhone,
  sessionId,
}: StepUpAuthModalProps) {
  const [step, setStep] = useState<'select' | 'verify'>('select');
  const [selectedMethod, setSelectedMethod] = useState<StepUpMethod | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedMethod(null);
      setCode('');
      setError(null);
      setSuccess(false);
      setRemainingAttempts(3);
    }
  }, [isOpen]);

  // Handle method selection
  const handleSelectMethod = useCallback(async (method: StepUpMethod) => {
    setSelectedMethod(method);
    setError(null);

    // For passkey, trigger immediately
    if (method === 'passkey_reauth') {
      await handlePasskeyAuth();
      return;
    }

    // For OTP methods, send the code
    if (method === 'email_otp' || method === 'sms_otp' || method === 'whatsapp_otp') {
      await sendCode(method);
    }

    setStep('verify');
  }, []);

  // Send OTP code
  const sendCode = async (method: StepUpMethod) => {
    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/step-up/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          method,
          email: userEmail,
          phone: userPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setCountdown(60); // 60 seconds before resend
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في إرسال الرمز');
    } finally {
      setSending(false);
    }
  };

  // Verify code
  const handleVerify = async () => {
    if (!selectedMethod || !code || code.length < 6) {
      setError('يرجى إدخال الرمز كاملاً');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/step-up/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code,
          method: selectedMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRemainingAttempts(data.remainingAttempts ?? remainingAttempts - 1);
        throw new Error(data.error || 'Verification failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحقق');
    } finally {
      setLoading(false);
    }
  };

  // Handle passkey authentication
  const handlePasskeyAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get challenge from server
      const challengeRes = await fetch('/api/auth/passkey/authenticate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!challengeRes.ok) throw new Error('Failed to get challenge');

      const options = await challengeRes.json();

      // Trigger WebAuthn
      const credential = await navigator.credentials.get({
        publicKey: options,
      });

      if (!credential) throw new Error('Authentication cancelled');

      // Verify with server
      const verifyRes = await fetch('/api/auth/step-up/verify-passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          credential,
        }),
      });

      if (!verifyRes.ok) throw new Error('Passkey verification failed');

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحقق بالبصمة');
    } finally {
      setLoading(false);
    }
  };

  // Get risk reason message
  const getRiskMessage = () => {
    if (riskAssessment.reasons.length === 0) {
      return 'مطلوب تحقق إضافي للأمان';
    }
    return riskAssessment.reasons[0].messageAr;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Shield className={cn('h-5 w-5', riskColors[riskAssessment.level])} />
            <span>تحقق إضافي مطلوب</span>
          </DialogTitle>
          <DialogDescription className="text-right">
            {getRiskMessage()}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Success State */}
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-600">تم التحقق بنجاح!</p>
            </motion.div>
          ) : step === 'select' ? (
            /* Method Selection */
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3 py-4"
            >
              {availableMethods.map((method) => {
                const config = methodConfig[method];
                const Icon = config.icon;
                const isDisabled = 
                  (method === 'email_otp' && !userEmail) ||
                  (method === 'sms_otp' && !userPhone);

                return (
                  <button
                    key={method}
                    onClick={() => handleSelectMethod(method)}
                    disabled={isDisabled || loading}
                    className={cn(
                      'w-full p-4 rounded-lg border-2 flex items-center gap-4',
                      'transition-all duration-200 text-right',
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5',
                      loading && 'opacity-50 cursor-wait'
                    )}
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{config.labelAr}</p>
                      <p className="text-sm text-muted-foreground">
                        {config.descriptionAr}
                      </p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            /* Code Verification */
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              {/* Back button */}
              <button
                onClick={() => setStep('select')}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span>← اختر طريقة أخرى</span>
              </button>

              {/* Method indicator */}
              {selectedMethod && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  {(() => {
                    const IconComp = methodConfig[selectedMethod].icon;
                    return <IconComp className="h-5 w-5 text-primary" />;
                  })()}
                  <span className="font-medium">
                    {methodConfig[selectedMethod].labelAr}
                  </span>
                </div>
              )}

              {/* Code input */}
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                  dir="ltr"
                />
                <p className="text-sm text-muted-foreground text-center">
                  أدخل الرمز المكون من 6 أرقام
                </p>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-500">{error}</p>
                </motion.div>
              )}

              {/* Remaining attempts warning */}
              {remainingAttempts <= 2 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <p className="text-sm text-yellow-600">
                    المحاولات المتبقية: {remainingAttempts}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleVerify}
                  disabled={loading || code.length < 6}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  تحقق
                </Button>

                {(selectedMethod === 'email_otp' || selectedMethod === 'sms_otp') && (
                  <Button
                    variant="outline"
                    onClick={() => sendCode(selectedMethod)}
                    disabled={sending || countdown > 0}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : countdown > 0 ? (
                      <span>{countdown}s</span>
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default StepUpAuthModal;

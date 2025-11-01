'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/card';
import { LoginFeedback } from './login/LoginFeedback';
import { LoginStepper } from './login/LoginStepper';
import { LoginCredentialsStep } from './login/LoginCredentialsStep';
import { LoginTwoFactorStep } from './login/LoginTwoFactorStep';
import { LoginSuccessStep } from './login/LoginSuccessStep';
import { useLoginFlow } from './login/useLoginFlow';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedLoginFormProps {
  onClose?: () => void;
}

export default function EnhancedLoginForm({ onClose }: EnhancedLoginFormProps) {
  const {
    credentials,
    currentStep,
    currentStepIndex,
    feedback,
    formErrors,
    isSubmitting,
    resendCooldown,
    steps,
    trustDevice,
    twoFactorCode,
    twoFactorState,
    formatTimeLeft,
    handleBackToCredentials,
    handleContinue,
    handleCredentialFieldChange,
    handleCredentialsSubmit,
    handleRememberMeChange,
    handleResend,
    handleSocialLogin,
    handleTwoFactorCodeChange,
    handleTwoFactorSubmit,
    handleTrustDeviceChange,
  } = useLoginFlow({ onClose });

  return (
    <Card className="w-full max-w-md border-none bg-white/10 p-1 backdrop-blur-lg transition-all hover:shadow-xl dark:bg-slate-800/50">
      <CardHeader className="space-y-3 rounded-2xl bg-white/80 p-6 text-right shadow-inner backdrop-blur-md transition-all duration-300 hover:bg-white/90 dark:bg-slate-900/80 dark:hover:bg-slate-900/90">
        <div className="flex justify-between">
          <span className="text-xs font-semibold text-indigo-500">
            نظام آمن
          </span>
          <ShieldCheck className="h-5 w-5 text-indigo-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
          تسجيل الدخول إلى حسابك
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          أدخل بياناتك للوصول إلى جميع ميزات النظام التعليمي.
        </CardDescription>
        <LoginStepper 
          steps={steps} 
          currentStepIndex={currentStepIndex} 
          className="mt-4"
        />
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <LoginFeedback feedback={feedback} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut"
            }}
          >
            {currentStep === 'credentials' && (
              <LoginCredentialsStep
                credentials={credentials}
                errors={formErrors}
                isSubmitting={isSubmitting}
                onSubmit={handleCredentialsSubmit}
                onFieldChange={handleCredentialFieldChange}
                onRememberMeChange={handleRememberMeChange}
                onSocialLogin={handleSocialLogin}
              />
            )}

            {currentStep === 'two-factor' && twoFactorState && (
              <LoginTwoFactorStep
                state={twoFactorState}
                code={twoFactorCode}
                trustDevice={trustDevice}
                isSubmitting={isSubmitting}
                resendCooldown={resendCooldown}
                formatTimeLeft={formatTimeLeft}
                onSubmit={handleTwoFactorSubmit}
                onChangeCode={handleTwoFactorCodeChange}
                onTrustDeviceChange={handleTrustDeviceChange}
                onResend={handleResend}
                onBack={handleBackToCredentials}
              />
            )}

            {currentStep === 'success' && (
              <LoginSuccessStep onContinue={handleContinue} />
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>

      <CardFooter className="flex flex-col items-end gap-2 border-t border-white/10 bg-white/40 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
        <p>
          نظام آمن وموثوق.{' '}
          <Link href="/terms" className="text-indigo-600 hover:text-indigo-700">
            شروط الاستخدام
          </Link>{' '}
          و{' '}
          <Link
            href="/privacy"
            className="text-indigo-600 hover:text-indigo-700"
          >
            سياسة الخصوصية
          </Link>
          .
        </p>
        <p>نظام آمن وموثوق.{' '} support@thanawy.app</p>
      </CardFooter>
    </Card>
  );
}

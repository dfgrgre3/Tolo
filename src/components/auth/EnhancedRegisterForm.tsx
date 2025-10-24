'use client';

import Link from 'next/link';
import { ShieldPlus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/card';
import { RegistrationStepper } from './register/RegistrationStepper';
import { RegistrationFeedback } from './register/RegistrationFeedback';
import { RegistrationAccountStep } from './register/RegistrationAccountStep';
import { RegistrationSecurityStep } from './register/RegistrationSecurityStep';
import { RegistrationSuccessStep } from './register/RegistrationSuccessStep';
import { useRegistrationFlow } from './register/useRegistrationFlow';

interface EnhancedRegisterFormProps {
  onClose?: () => void;
}

export default function EnhancedRegisterForm({
  onClose,
}: EnhancedRegisterFormProps) {
  const {
    currentStep,
    profile,
    security,
    feedback,
    formErrors,
    isSubmitting,
    result,
    passwordEvaluation,
    handleProfileSubmit,
    handleSecuritySubmit,
    handleProfileChange,
    handleSecurityFieldChange,
    handleSecurityToggleChange,
    handleBackToProfile,
    handleContinue,
  } = useRegistrationFlow({ onClose });

  return (
    <Card className="w-full border-none bg-white/10 p-1 backdrop-blur">
      <CardHeader className="space-y-3 rounded-2xl bg-white/80 p-6 text-right shadow-inner dark:bg-slate-900/80">
        <div className="flex justify-between">
          <span className="text-xs font-semibold text-indigo-500">
            حساب طالب موحد
          </span>
          <ShieldPlus className="h-5 w-5 text-indigo-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
          إنشاء حساب دراسي متكامل
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          ابدأ رحلتك الدراسية بتنظيمٍ متقدم، ونظام أمان مرن يدعم خططك الأسبوعية
          وتذكيراتك اليومية.
        </CardDescription>
        <RegistrationStepper currentStep={currentStep} />
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <RegistrationFeedback feedback={feedback} />

        {currentStep === 'profile' && (
          <RegistrationAccountStep
            profile={profile}
            errors={formErrors}
            isSubmitting={isSubmitting}
            onSubmit={handleProfileSubmit}
            onChange={handleProfileChange}
          />
        )}

        {currentStep === 'security' && (
          <RegistrationSecurityStep
            security={security}
            errors={formErrors}
            passwordScore={passwordEvaluation.score}
            passwordLabel={passwordEvaluation.label}
            passwordRequirements={passwordEvaluation.requirements}
            isSubmitting={isSubmitting}
            onSubmit={handleSecuritySubmit}
            onFieldChange={handleSecurityFieldChange}
            onToggleChange={handleSecurityToggleChange}
            onBack={handleBackToProfile}
          />
        )}

        {currentStep === 'success' && (
          <RegistrationSuccessStep result={result} onContinue={handleContinue} />
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-end gap-2 border-t border-white/10 bg-white/40 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
        <p>
          بالتسجيل، فأنت توافق على{' '}
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
        <p>للدعم الفني: support@thanawy.app</p>
      </CardFooter>
    </Card>
  );
}

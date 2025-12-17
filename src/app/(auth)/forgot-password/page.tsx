'use client';

/**
 * 🔑 صفحة استعادة كلمة المرور
 */

import { Suspense } from 'react';
import { ForgotPasswordForm, AuthLayout } from '@/app/(auth)/components';

function ForgotPasswordContent() {
  return <ForgotPasswordForm />;
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      }>
        <ForgotPasswordContent />
      </Suspense>
    </AuthLayout>
  );
}

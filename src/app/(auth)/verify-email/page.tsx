'use client';

/**
 * 📧 صفحة التحقق من البريد الإلكتروني
 */

import { Suspense } from 'react';
import { EmailVerification, AuthLayout } from '@/app/(auth)/components';

function VerifyEmailContent() {
  return <EmailVerification />;
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}

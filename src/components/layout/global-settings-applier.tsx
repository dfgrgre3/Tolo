'use client';

/**
 * GlobalSettingsApplier - Component يطبق إعدادات المستخدم على كامل التطبيق
 *
 * يظڈوضع داخل AuthProvider لتطبيق إعدادات الم٪ر واللغة
 * فور تسجيل الدخول أو تطبيقها من الكاش المحلي.
 */

import { useGlobalSettings } from '@/hooks';

export default function GlobalSettingsApplier({ children }: { children: React.ReactNode }) {
  useGlobalSettings();
  return <>{children}</>;
}

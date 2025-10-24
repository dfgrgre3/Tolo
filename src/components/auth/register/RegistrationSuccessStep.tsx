import { useCallback, useMemo } from 'react';
import { Button } from '@/shared/button';
import {
  BadgeCheck,
  ClipboardCopy,
  ListChecks,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';
import type { RegistrationResult } from './types';

interface RegistrationSuccessStepProps {
  result: RegistrationResult | null;
  onContinue: () => void;
}

export function RegistrationSuccessStep({
  result,
  onContinue,
}: RegistrationSuccessStepProps) {
  const backupCodes = useMemo(
    () => result?.twoFactorSetup?.backupCodes ?? [],
    [result?.twoFactorSetup?.backupCodes],
  );

  const handleCopySecret = useCallback(() => {
    if (!result?.twoFactorSetup) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const payload = [
      `الرمز السري: ${result.twoFactorSetup.secret}`,
      '',
      'أكواد النسخة الاحتياطية:',
      ...backupCodes,
    ].join('\n');

    navigator.clipboard.writeText(payload).catch(() => undefined);
  }, [backupCodes, result]);

  return (
    <div className="space-y-6 text-right">
      <div className="space-y-3 rounded-2xl bg-emerald-500/10 p-6 text-emerald-700 shadow-inner dark:bg-emerald-500/15 dark:text-emerald-100">
        <p className="flex items-center justify-end gap-2 text-lg font-semibold">
          <BadgeCheck className="h-5 w-5" />
          تم إنشاء حسابك بنجاح
        </p>
        <p className="text-sm leading-6">
          أرسلنا رسالة تأكيد إلى البريد الإلكتروني{' '}
          <span className="font-semibold text-emerald-700 dark:text-emerald-200">
            {result?.email}
          </span>{' '}
          تحتوي على رابط تفعيل الحساب. يرجى إتمام التحقق خلال 24 ساعة للحفاظ على
          أمان حسابك.
        </p>
      </div>

      {result?.postActions?.length ? (
        <div className="space-y-3 rounded-2xl border border-indigo-200 bg-white/80 p-5 text-xs text-slate-600 dark:border-indigo-900/50 dark:bg-slate-900/60 dark:text-slate-200">
          <p className="flex items-center justify-end gap-2 font-medium text-indigo-600 dark:text-indigo-300">
            <ListChecks className="h-4 w-4" />
            ملخص ما قمنا به بعد التسجيل
          </p>
          <ul className="space-y-2">
            {result.postActions.map((action, index) => (
              <li
                key={`${action.type}-${index}`}
                className="rounded-lg border border-dashed border-indigo-200/60 bg-white/70 px-3 py-2 text-right dark:border-indigo-800/50 dark:bg-slate-900/70"
              >
                <span className="font-medium text-slate-700 dark:text-slate-100">
                  {action.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
        <p className="flex items-center justify-end gap-2 font-medium">
          <MailCheck className="h-4 w-4 text-indigo-500" />
          خطوات موصى بها بعد التفعيل
        </p>
        <ul className="list-disc space-y-2 pr-4">
          <li>تحقق من مجلد الرسائل غير المرغوب فيها إذا لم تصلك رسالة التفعيل.</li>
          <li>
            حدّث إعدادات الأمان لاختيار الأجهزة الموثوقة وتفعيل المصادقة الثنائية
            بالكامل.
          </li>
          <li>
            خصص تفضيلات الإشعارات لتصلك ملخصات الدراسة والتذكيرات المهمة في
            الوقت المناسب.
          </li>
        </ul>
        {result?.verificationLink && (
          <div className="rounded-lg border border-dashed border-indigo-300 bg-white/80 p-3 font-mono text-[11px] text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
            رابط التفعيل (لغرض التطوير): {result.verificationLink}
          </div>
        )}
      </div>

      {result?.twoFactorSetup ? (
        <div className="space-y-3 rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-5 text-xs text-emerald-700 shadow-inner dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <div className="flex items-center justify-between">
            <p className="font-semibold">تهيئة المصادقة الثنائية</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleCopySecret}
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              نسخ البيانات
            </Button>
          </div>
          <p className="leading-6 text-emerald-700/90 dark:text-emerald-100/90">
            استخدم الرمز السري التالي داخل تطبيق المصادقة لديك، ثم أدخل الكود
            المولد في صفحة الأمان لإكمال التفعيل.
          </p>
          <div className="rounded-lg border border-emerald-300 bg-white/70 p-3 font-mono text-sm tracking-wide dark:border-emerald-500/40 dark:bg-emerald-950/30">
            {result.twoFactorSetup.secret}
          </div>
          {backupCodes.length ? (
            <div>
              <p className="mb-2 font-medium">أكواد احتياطية للطوارئ:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {backupCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded border border-emerald-200 bg-white/80 p-2 text-center font-mono text-sm dark:border-emerald-500/40 dark:bg-emerald-800/40"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Button
        className="flex w-full items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
        onClick={onContinue}
      >
        <ShieldCheck className="h-4 w-4" />
        البدء في استخدام التطبيق
      </Button>
    </div>
  );
}

import type { RegistrationStep } from './types';

export const REGISTRATION_STEPS: RegistrationStep[] = [
  'profile',
  'security',
  'success',
];

export const REGISTRATION_STEP_LABELS: Record<RegistrationStep, string> = {
  profile: 'البيانات الأساسية',
  security: 'التأمين وإعداد كلمة المرور',
  success: 'تفعيل الحساب',
};

export const PASSWORD_REQUIREMENT_LABELS: Record<string, string> = {
  length: 'ثمانية أحرف على الأقل',
  upper: 'حرف كبير واحد على الأقل',
  lower: 'حرف صغير واحد على الأقل',
  number: 'رقم واحد على الأقل',
  symbol: 'رمز خاص واحد على الأقل',
};

export const PASSWORD_STRENGTH_LEVELS = [
  { minScore: 90, label: 'ممتاز', className: 'bg-emerald-600 text-white' },
  { minScore: 70, label: 'قوي', className: 'bg-emerald-500 text-white' },
  { minScore: 50, label: 'جيد', className: 'bg-amber-500 text-white' },
  { minScore: 30, label: 'متوسط', className: 'bg-amber-400 text-slate-900' },
  { minScore: 0, label: 'ضعيف', className: 'bg-rose-500 text-white' },
];

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { ApiError } from "@/lib/api/api-client";
import { registerUserRaw } from "@/features/auth/api";
import RegisterFormFields, { RegisterFormValues } from "./RegisterFormFields";
import { getPasswordPolicyError } from "@/lib/auth/password-policy";
import { normalizePhoneToE164 } from "@/lib/phone";

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

const INITIAL_VALUES: RegisterFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  username: "",
  phone: "",
  referralCode: "",
  agreedToTerms: false,
};

/**
 * RegisterForm — owns registration state and the call into `/auth/register`;
 * presentation lives in `RegisterFormFields` (mirrors the LoginForm /
 * LoginCredentialsStep split).
 */
export default function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<RegisterFormValues>(INITIAL_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const handleChange = <K extends keyof RegisterFormValues>(
    field: K,
    value: RegisterFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      username,
      phone,
      referralCode,
      agreedToTerms,
    } = values;

    if (!firstName || !lastName || !email || !password || !confirmPassword || !username || !phone) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const policyError = getPasswordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    if (!agreedToTerms) {
      setError("يجب الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة");
      return;
    }

    // Backend requires E.164 (e.g. +201012345678) while users type local
    // numbers (01xxxxxxxxx) — normalize here so registration never fails
    // on format, and show a clear message for truly invalid input.
    const normalizedPhone = normalizePhoneToE164(phone);
    if (!normalizedPhone) {
      setError("رقم الهاتف غير صالح — أدخل رقمًا مصريًا مثل 01xxxxxxxxx أو بالصيغة الدولية +201xxxxxxxxx");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Routes /api/auth/register → Next.js proxy → Go backend.
      // CSRF + idempotency headers and envelope unwrapping live in transport.
      const normalizedEmail = email.trim().toLowerCase();
      await registerUserRaw({
        firstName,
        lastName,
        // Same normalization as login: email is case-insensitive, so a
        // differently-cased login attempt must still match this account.
        email: normalizedEmail,
        password,
        username,
        phone: normalizedPhone,
        // Public registration can only create the least-privileged account.
        // Parent/teacher onboarding must be approved separately by the backend.
        role: "STUDENT",
        referralCode: referralCode || undefined,
        consents: {
          termsAccepted: true,
          termsVersion: "2026-01",
          privacyAccepted: true,
          privacyVersion: "2026-01",
          acceptedAt: new Date().toISOString(),
        },
      });

      // Remember which email still needs verification so the verify-email
      // page can resend the OTP without requiring a session first.
      try {
        window.localStorage.setItem("thanawy:pending-verification-email", normalizedEmail);
      } catch {
        // Convenience only — never fail registration over it.
      }
      router.push("/login?registered=true");
    } catch (err: unknown) {
      setError(toErrorMessage(err, "حدث خطأ غير متوقع أثناء إنشاء الحساب"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (!values.firstName || !values.lastName || !values.email || !values.password || !values.confirmPassword) {
      setError("يرجى إكمال بيانات الهوية أولًا"); return;
    }
    const policyError = getPasswordPolicyError(values.password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (values.password !== values.confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }
    setError(null); setStep(2);
  };

  return (
    <Card className="w-full rounded-3xl border border-[#0F766E]/15 bg-white shadow-xl shadow-slate-900/10 dark:border-[#2DD4BF]/20 dark:bg-slate-900">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E] dark:text-[#5EEAD4]">
            <UserPlus className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">إنشاء حساب جديد</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">أدخل بياناتك لإنشاء حساب والبدء في استخدام المنصة</CardDescription>
      </CardHeader>
      <RegisterFormFields
        values={values}
        onChange={handleChange}
        error={error}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        step={step}
        onNext={handleNext}
        onBack={() => { setError(null); setStep(1); }}
      />
    </Card>
  );
}

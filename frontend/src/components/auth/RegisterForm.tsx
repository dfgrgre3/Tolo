"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import RegisterFormFields, { RegisterFormValues } from "./RegisterFormFields";

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
  role: "STUDENT",
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
      role,
      referralCode,
      agreedToTerms,
    } = values;

    if (!firstName || !lastName || !email || !password || !confirmPassword || !username || !phone) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (password.length < 8) {
      setError("يجب أن تكون كلمة المرور 8 أحرف على الأقل");
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

    setIsLoading(true);
    setError(null);

    try {
      // apiClient routes /api/auth/register → Next.js proxy → Go backend.
      // It also attaches CSRF + idempotency headers and unwraps the envelope.
      await apiClient.post(apiRoutes.auth.register, {
        firstName,
        lastName,
        email,
        password,
        username,
        phone,
        role,
        referralCode: referralCode || undefined,
      });

      router.push("/login?registered=true");
    } catch (err: unknown) {
      setError(toErrorMessage(err, "حدث خطأ غير متوقع أثناء إنشاء الحساب"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
      />
    </Card>
  );
}

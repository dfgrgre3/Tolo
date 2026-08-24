"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import RegisterIdentityFields from "./RegisterIdentityFields";
import RegisterAccountFields from "./RegisterAccountFields";

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  phone: string;
  role: string;
  referralCode: string;
  agreedToTerms: boolean;
}

interface RegisterFormFieldsProps {
  values: RegisterFormValues;
  onChange: <K extends keyof RegisterFormValues>(field: K, value: RegisterFormValues[K]) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Presentational fields for `RegisterForm` — owns no state, just renders +
 * reports changes. Field groups live in `RegisterIdentityFields` (name/email/
 * password) and `RegisterAccountFields` (username/phone/role/referral/terms).
 */
export default function RegisterFormFields({
  values,
  onChange,
  error,
  isLoading,
  onSubmit,
}: RegisterFormFieldsProps) {
  return (
    <form onSubmit={onSubmit}>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-semibold mr-2">خطأ في إنشاء الحساب</AlertTitle>
            <AlertDescription dir="rtl" className="mr-2">{error}</AlertDescription>
          </Alert>
        )}

        <RegisterIdentityFields
          firstName={values.firstName}
          onFirstNameChange={(v) => onChange("firstName", v)}
          lastName={values.lastName}
          onLastNameChange={(v) => onChange("lastName", v)}
          email={values.email}
          onEmailChange={(v) => onChange("email", v)}
          password={values.password}
          onPasswordChange={(v) => onChange("password", v)}
          confirmPassword={values.confirmPassword}
          onConfirmPasswordChange={(v) => onChange("confirmPassword", v)}
          isLoading={isLoading}
        />

        <RegisterAccountFields
          username={values.username}
          onUsernameChange={(v) => onChange("username", v)}
          phone={values.phone}
          onPhoneChange={(v) => onChange("phone", v)}
          role={values.role}
          onRoleChange={(v) => onChange("role", v)}
          referralCode={values.referralCode}
          onReferralCodeChange={(v) => onChange("referralCode", v)}
          agreedToTerms={values.agreedToTerms}
          onAgreedToTermsChange={(v) => onChange("agreedToTerms", v)}
          isLoading={isLoading}
        />
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-4">
        <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading || !values.agreedToTerms}>
          {isLoading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري التسجيل...
            </>
          ) : (
            "إنشاء الحساب"
          )}
        </Button>
        <div className="text-sm text-center text-slate-500 dark:text-slate-400 font-medium">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
            تسجيل الدخول
          </Link>
        </div>
      </CardFooter>
    </form>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Gift, Phone } from "lucide-react";

interface RegisterAccountFieldsProps {
  username: string;
  onUsernameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  referralCode: string;
  onReferralCodeChange: (value: string) => void;
  agreedToTerms: boolean;
  onAgreedToTermsChange: (value: boolean) => void;
  isLoading: boolean;
}

/** Username / phone / role / referral / terms fields for `RegisterFormFields`. */
export default function RegisterAccountFields({
  username,
  onUsernameChange,
  phone,
  onPhoneChange,
  role,
  onRoleChange,
  referralCode,
  onReferralCodeChange,
  agreedToTerms,
  onAgreedToTermsChange,
  isLoading,
}: RegisterAccountFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">اسم المستخدم</Label>
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              <User className="h-4 w-4" />
            </span>
            <Input
              id="username"
              placeholder="username"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              required
              disabled={isLoading}
              className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">رقم الهاتف</Label>
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              <Phone className="h-4 w-4" />
            </span>
            <Input
              id="phone"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              required
              disabled={isLoading}
              className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">نوع الحساب</Label>
          <Select value={role} onValueChange={onRoleChange} disabled={isLoading}>
            <SelectTrigger id="role" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary text-right flex-row-reverse">
              <SelectValue placeholder="اختر نوع الحساب" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <SelectItem value="STUDENT" className="text-right justify-end font-medium">طالب</SelectItem>
              <SelectItem value="PARENT" className="text-right justify-end font-medium">ولي أمر</SelectItem>
              <SelectItem value="TEACHER" className="text-right justify-end font-medium">معلم</SelectItem>
            </SelectContent>
          </Select>
          {role === "TEACHER" && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              قد تتم مراجعة حساب المعلم قبل تفعيل بعض الصلاحيات.
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="referralCode" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">كود الإحالة (اختياري)</Label>
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              <Gift className="h-4 w-4" />
            </span>
            <Input
              id="referralCode"
              placeholder="REF-1234"
              value={referralCode}
              onChange={(e) => onReferralCodeChange(e.target.value)}
              disabled={isLoading}
              className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary text-center"
            />
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-2 space-x-reverse">
        <Checkbox
          id="agreedToTerms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => onAgreedToTermsChange(!!checked)}
          disabled={isLoading}
          className="mt-0.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label htmlFor="agreedToTerms" className="text-xs text-slate-500 dark:text-slate-400 select-none cursor-pointer font-medium leading-relaxed">
          أوافق على{" "}
          <Link href="/terms" target="_blank" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
            الشروط والأحكام
          </Link>{" "}
          و{" "}
          <Link href="/privacy" target="_blank" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
            سياسة الخصوصية
          </Link>
        </Label>
      </div>
    </>
  );
}

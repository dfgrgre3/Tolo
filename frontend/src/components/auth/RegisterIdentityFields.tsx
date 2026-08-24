"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock } from "lucide-react";

interface RegisterIdentityFieldsProps {
  firstName: string;
  onFirstNameChange: (value: string) => void;
  lastName: string;
  onLastNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  isLoading: boolean;
}

/** Name / email / password fields for `RegisterFormFields`. */
export default function RegisterIdentityFields({
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  isLoading,
}: RegisterIdentityFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="firstName" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">الاسم الأول</Label>
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              <User className="h-4 w-4" />
            </span>
            <Input
              id="firstName"
              placeholder="أحمد"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              required
              disabled={isLoading}
              className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">الاسم الأخير</Label>
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              <User className="h-4 w-4" />
            </span>
            <Input
              id="lastName"
              placeholder="علي"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              required
              disabled={isLoading}
              className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">البريد الإلكتروني</Label>
        <div className="relative">
          <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
            <Mail className="h-4 w-4" />
          </span>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            disabled={isLoading}
            dir="ltr"
            className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">كلمة المرور</Label>
        <div className="relative">
          <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            disabled={isLoading}
            dir="ltr"
            className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">تأكيد كلمة المرور</Label>
        <div className="relative">
          <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            required
            disabled={isLoading}
            dir="ltr"
            className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
      </div>
    </>
  );
}

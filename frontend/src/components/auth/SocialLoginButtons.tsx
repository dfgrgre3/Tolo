"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Chrome, Apple } from "lucide-react";

interface SocialLoginButtonsProps {
  isLoading: boolean;
  onSelect: (provider: "google" | "apple") => void;
}

/** The "or continue with" divider + provider buttons on the credentials step of `LoginForm`. */
export default function SocialLoginButtons({ isLoading, onSelect }: SocialLoginButtonsProps) {
  return (
    <>
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200 dark:border-slate-800/80" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium rounded-full">أو تسجيل الدخول بواسطة</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSelect("google")}
          disabled={isLoading}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/50"
        >
          <Chrome className="ml-2 h-4 w-4 text-red-500" /> Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onSelect("apple")}
          disabled={isLoading}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/50"
        >
          <Apple className="ml-2 h-4 w-4 text-slate-900 dark:text-slate-200" /> Apple
        </Button>
      </div>
    </>
  );
}

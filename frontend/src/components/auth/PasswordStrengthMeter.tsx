"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPasswordRequirements,
  getPasswordStrength,
} from "@/lib/auth/password-policy";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

/**
 * PasswordStrengthMeter — the single password-requirements + strength UI.
 *
 * Every screen that accepts a new password (registration, reset-password,
 * change-password) renders this exact component, and it reads the same
 * `password-policy` module the validators use — so what the user sees is always
 * what the backend enforces. The backend remains authoritative; this is the UX
 * mirror (auth audit, point 11).
 */
export default function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);
  const requirements = getPasswordRequirements(password);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex items-center gap-2"
        role="status"
        aria-label={`قوة كلمة المرور: ${strength.label}`}
      >
        <div className="flex flex-1 gap-1">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                strength.score >= i ? strength.className : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{strength.label}</span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {requirements.map((req) => (
          <li
            key={req.id}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              req.satisfied
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {req.satisfied ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

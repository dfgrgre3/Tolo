"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoaderCircle, RefreshCw, ShieldCheck, CircleCheck, AlertCircle } from "lucide-react";
import {
  generateChallenge,
  verifyChallenge,
  challengePromptText,
  type HumanChallenge,
} from "@/lib/auth/human-challenge";

interface HumanCheckProps {
  /** Called once with an opaque local token when the user solves it. */
  onSolved: (token: string) => void;
  /** Compact layout for tight forms. Defaults to false. */
  compact?: boolean;
}

/**
 * HumanCheck — local proof-of-humanity step shown after repeated auth
 * failures (see `attempt-throttle.ts`).
 *
 * This is bot FRICTION, not a security boundary: the puzzle and its answer
 * live in the client and nothing is sent to any server (the token passed to
 * `onSolved` is an opaque local marker, never a credential). The backend's
 * HTTP 429 remains the real enforcement. See `human-challenge.ts` for the
 * upgrade path to a provider CAPTCHA.
 */
export default function HumanCheck({ onSolved, compact = false }: HumanCheckProps) {
  const [challenge, setChallenge] = useState<HumanChallenge>(() => generateChallenge());
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [checking, setChecking] = useState(false);

  const refresh = () => {
    setChallenge(generateChallenge());
    setInput("");
    setError(null);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (solved || checking) return;
    setChecking(true);
    const ok = verifyChallenge(challenge, { challengeId: challenge.id, input });
    setChecking(false);
    if (ok) {
      setSolved(true);
      setError(null);
      onSolved(`local-${challenge.id}`);
    } else {
      setError("إجابة غير صحيحة، حاول مع مسألة جديدة");
      refresh();
    }
  };

  if (solved) {
    return (
      <Alert className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
        <CircleCheck className="h-4 w-4 text-green-500" />
        <AlertDescription dir="rtl" className="me-2 text-sm font-semibold">
          تم التحقق بنجاح، يمكنك المتابعة
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/5 ${compact ? "p-3" : "p-4"}`}
    >
      <form onSubmit={handleVerify} className="grid gap-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <p className="text-xs font-bold">تحقق سريع: أثبت أنك لست برنامجاً آلياً للمتابعة</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="human-check-answer" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {challengePromptText(challenge)}
            </Label>
            <Input
              id="human-check-answer"
              inputMode="numeric"
              autoComplete="off"
              placeholder="الإجابة بالأرقام"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
              disabled={checking}
              dir="ltr"
              className="bg-white dark:bg-slate-950 text-center font-bold tracking-widest border-slate-200 dark:border-slate-800"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={checking}
            title="مسألة جديدة"
            aria-label="مسألة جديدة"
            className="shrink-0 text-slate-500 hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="outline"
          disabled={checking || input.trim().length === 0}
          className="w-full font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
        >
          {checking ? (
            <>
              <LoaderCircle className="ms-2 h-4 w-4" />
              جاري التحقق...
            </>
          ) : (
            "تحقق"
          )}
        </Button>
      </form>
    </div>
  );
}

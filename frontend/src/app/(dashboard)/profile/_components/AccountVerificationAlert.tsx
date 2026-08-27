"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

/**
 * Renders a dismissable banner when the signed-in user has an unverified
 * email or phone. The action posts to `/api/auth/resend-verification` — there is
 * no phone-verification endpoint, so only the email code can be re-sent.
 */
export default function AccountVerificationAlert() {
  const { user } = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || dismissed) return null;

  const emailUnverified = !user.emailVerified;
  const phoneUnverified = !!user.phone && !user.phoneVerified;

  if (!emailUnverified && !phoneUnverified) return null;

  async function resend() {
    setIsSending(true);
    try {
      await apiClient.post(apiRoutes.auth.resendVerification, {});
      setSent(true);
      toast.success("أرسلنا رمز التأكيد إلى بريدك الإلكتروني");
    } catch {
      toast.error("تعذر إرسال رمز التأكيد، حاول مرة أخرى.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>تأكيد الحساب مطلوب</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span>
          {emailUnverified && "لم يتم تأكيد بريدك الإلكتروني بعد."}
          {emailUnverified && phoneUnverified && " "}
          {phoneUnverified && "رقم هاتفك غير موثّق أيضًا."}
        </span>
        <div className="flex items-center gap-2">
          {emailUnverified && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={resend}
              disabled={isSending || sent}
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MailCheck className="w-3.5 h-3.5" />
              )}
              {sent ? "تم الإرسال" : "إرسال رمز التأكيد"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            aria-label="إغلاق التنبيه"
          >
            إغلاق
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

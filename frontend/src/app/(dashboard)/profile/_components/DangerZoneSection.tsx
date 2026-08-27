"use client";

import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { useAuthContext } from "@/contexts/auth-context";

const DELETE_CONFIRMATION_WORD = "DELETE";

/**
 * 10.16 — only "delete account" is implemented: it's the one destructive
 * operation with a real backend route (`auth.deleteAccount`). "Log out of
 * all devices" is intentionally NOT here — there is no sessions/devices API
 * in this codebase to revoke (see 06 — Sessions and Devices: not built yet).
 *
 * The backend's `DeleteAccountRequest` requires `confirmation: "DELETE"` in
 * addition to the password — a typo-proof guard against firing the request
 * on an accidental click, not decoration.
 */
export default function DangerZoneSection() {
  const { logout } = useAuthContext();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    if (!password) {
      setError("يرجى إدخال كلمة المرور لتأكيد حذف الحساب.");
      return;
    }
    if (confirmation !== DELETE_CONFIRMATION_WORD) {
      setError(`يرجى كتابة "${DELETE_CONFIRMATION_WORD}" لتأكيد الحذف.`);
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      await apiClient.delete(apiRoutes.auth.deleteAccount, {
        body: JSON.stringify({ password, confirmation }),
      });
      toast.success("تم حذف الحساب");
      await logout();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر حذف الحساب، حاول مرة أخرى.";
      setError(message);
      toast.error(message);
      setIsDeleting(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="w-5 h-5" /> منطقة الخطر
        </CardTitle>
        <CardDescription>حذف حسابك إجراء نهائي ولا يمكن التراجع عنه.</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog
          open={open}
          onOpenChange={(v: boolean) => {
            setOpen(v);
            if (!v) {
              setPassword("");
              setConfirmation("");
              setError(null);
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive">حذف الحساب نهائيًا</Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف الحساب</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف بياناتك وتقدمك الدراسي نهائيًا. هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 px-1">
              <div className="space-y-2">
                <Label htmlFor="delete-account-password">كلمة المرور</Label>
                <Input
                  id="delete-account-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-account-confirmation">
                  اكتب <span dir="ltr" className="font-mono font-bold">{DELETE_CONFIRMATION_WORD}</span> للتأكيد
                </Label>
                <Input
                  id="delete-account-confirmation"
                  dir="ltr"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                حذف نهائيًا
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

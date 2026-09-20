"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { ApiError } from "@/lib/api/api-client";
import {
  requestEmailChange,
  verifyEmailChange,
} from "@/features/auth/api";
import { useAuthContext } from "@/contexts/auth-context";

export default function EmailChangeCard() {
  const { user, refreshUser } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function requestChange() {
    setPending(true);
    try {
      await requestEmailChange(email, password);
      setSent(true);
      setPassword("");
      toast.success("تم إرسال رمز التحقق إلى البريد الجديد");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذر بدء تغيير البريد");
    } finally { setPending(false); }
  }

  async function verifyChange() {
    setPending(true);
    try {
      await verifyEmailChange(code);
      await refreshUser();
      setSent(false); setCode(""); setEmail("");
      toast.success("تم تغيير البريد الإلكتروني وتوثيقه");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "رمز التحقق غير صالح أو منتهي");
    } finally { setPending(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> تغيير البريد الإلكتروني</CardTitle>
        <CardDescription>البريد الحالي: <span dir="ltr">{user?.email}</span>. يلزم إعادة المصادقة ثم تأكيد البريد الجديد.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sent ? <>
          <div className="space-y-2"><Label htmlFor="new-email">البريد الجديد</Label><Input id="new-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} /></div>
          <div className="space-y-2"><Label htmlFor="email-password">كلمة المرور الحالية</Label><Input id="email-password" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} /></div>
          <Button onClick={requestChange} disabled={pending || !email.trim() || !password}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} إرسال رمز التأكيد</Button>
        </> : <>
          <p className="text-sm text-muted-foreground">أدخل الرمز المرسل إلى <span dir="ltr">{email}</span>.</p>
          <Input aria-label="رمز تأكيد البريد" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} disabled={pending} />
          <div className="flex gap-2"><Button onClick={verifyChange} disabled={pending || code.length !== 6}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد البريد</Button><Button variant="ghost" onClick={() => setSent(false)} disabled={pending}>إلغاء</Button></div>
        </>}
      </CardContent>
    </Card>
  );
}

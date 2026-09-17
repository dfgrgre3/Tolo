"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { useAuthContext } from "@/contexts/auth-context";
import { useProfileData } from "./useProfileData";

export default function PhoneVerificationCard() {
  const { refreshUser } = useAuthContext();
  const { profile, refetch } = useProfileData();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!sent && profile?.phone) setPhone(profile.phone);
  }, [profile?.phone, sent]);

  async function sendCode() {
    setPending(true);
    try {
      await apiClient.post(apiRoutes.auth.phone.sendCode, { phone: phone.trim() });
      setSent(true);
      toast.success("تم إرسال رمز التحقق إلى هاتفك");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذر إرسال رمز التحقق");
    } finally { setPending(false); }
  }

  async function verify() {
    setPending(true);
    try {
      await apiClient.post(apiRoutes.auth.phone.verify, { code: code.trim() });
      await refreshUser();
      refetch();
      setSent(false);
      setCode("");
      toast.success("تم توثيق رقم الهاتف");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "رمز التحقق غير صالح");
    } finally { setPending(false); }
  }

  const verified = Boolean(profile?.phone && profile.phoneVerified);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> توثيق الهاتف</CardTitle>
        <CardDescription>استخدم رقمًا بصيغة دولية لاستقبال رمز تحقق لمرة واحدة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified ? <p className="flex items-center gap-2 text-sm text-emerald-600"><ShieldCheck className="h-4 w-4" /> رقم الهاتف موثّق</p> : null}
        <div className="space-y-2">
          <Label htmlFor="security-phone">رقم الهاتف</Label>
          <Input id="security-phone" dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+201234567890" disabled={pending} />
        </div>
        {!sent ? (
          <Button onClick={sendCode} disabled={pending || phone.trim().length === 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} إرسال الرمز
          </Button>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="phone-code">رمز التحقق</Label>
            <Input id="phone-code" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} disabled={pending} />
            <div className="flex gap-2">
              <Button onClick={verify} disabled={pending || code.length !== 6}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} توثيق الرقم</Button>
              <Button variant="ghost" onClick={() => setSent(false)} disabled={pending}>تغيير الرقم</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import {
  isPasskeySupported,
  listPasskeys,
  registerPasskey,
  removePasskey,
  type PasskeyDevice,
} from "@/services/auth/passkey-service";

export default function PasskeysCard() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<PasskeyDevice[] | null>(null);
  const [name, setName] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async (signal?: AbortSignal) => {
    try {
      const list = await listPasskeys();
      if (signal?.aborted) return;
      setDevices(list);
    } catch (err) {
      if (signal?.aborted) return;
      setDevices([]);
      setError(err instanceof Error ? err.message : "فشل تحميل مفاتيح المرور");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    isPasskeySupported().then((ok) => {
      if (!controller.signal.aborted) setSupported(ok);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external data on mount/param change; setState in async callback is intentional sync
    reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  async function handleRegister() {
    setError(null);
    setIsWorking(true);
    const result = await registerPasskey(name);
    setIsWorking(false);
    if (!result.success) {
      setError(result.error ?? "فشل في تسجيل مفتاح المرور");
      toast.error(result.error ?? "فشل في تسجيل مفتاح المرور");
      return;
    }
    setName("");
    toast.success("تم تسجيل مفتاح المرور بنجاح");
    await reload();
  }

  async function handleDelete(id: string) {
    const password = window.prompt("أدخل كلمة المرور الحالية لتأكيد حذف مفتاح المرور:");
    if (!password) return;
    setDeletingId(id);
    const result = await removePasskey(id, password);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error ?? "فشل حذف مفتاح المرور");
      return;
    }
    toast.success("تم حذف مفتاح المرور");
    setDevices((prev) => (prev ?? []).filter((d) => d.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5" /> مفاتيح المرور
        </CardTitle>
        <CardDescription>سجل الدخول بسرعة وأمان باستخدام بصمة الوجه أو الإصبع.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supported === false && (
          <p className="text-sm text-muted-foreground">متصفحك لا يدعم مفاتيح المرور</p>
        )}
        {devices === null ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد مفاتيح مرور مسجلة</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">{d.name || "مفتاح مرور"}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === d.id}
                  onClick={() => handleDelete(d.id)}
                  aria-label="حذف مفتاح المرور"
                >
                  {deletingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: هاتف iPhone الخاص بي"
            disabled={isWorking || supported === false}
            aria-label="اسم مفتاح المرور"
          />
          <Button onClick={handleRegister} disabled={isWorking || supported === false}>
            {isWorking && <Loader2 className="w-4 h-4 animate-spin" />}
            إضافة مفتاح مرور
          </Button>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </CardContent>
    </Card>
  );
}

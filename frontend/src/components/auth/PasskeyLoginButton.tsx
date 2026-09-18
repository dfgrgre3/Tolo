"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2 } from "lucide-react";
import { loginWithPasskey, isPasskeySupported } from "@/services/auth/passkey-service";
import { useAuthContext } from "@/contexts/auth-context";

export default function PasskeyLoginButton() {
  const router = useRouter();
  const { refreshUser } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  async function handleClick() {
    setError(null);
    if (!(await isPasskeySupported())) {
      setUnsupported(true);
      return;
    }
    setIsLoading(true);
    const result = await loginWithPasskey();
    setIsLoading(false);
    if (!result.success) {
      setError(result.error ?? "فشل تسجيل الدخول بمفتاح المرور");
      return;
    }
    await refreshUser().catch(() => {});
    router.push("/dashboard");
  }

  if (unsupported) return null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full font-bold"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
        الدخول بمفتاح المرور
      </Button>
      {error && <p className="text-xs text-destructive text-center" role="alert">{error}</p>}
    </div>
  );
}

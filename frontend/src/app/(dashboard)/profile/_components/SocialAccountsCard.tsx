"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chrome, Apple, Link2, Link2Off, Loader2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { getSocialLoginUrl } from "@/services/auth/login-service";

// Only google/apple: the backend's OAuth redirect-URL generator
// (`GetOAuthRedirectURL`) only implements those two providers — github is a
// valid value for the link/unlink DTOs but has no way to start its flow.
type Provider = "google" | "apple";

interface LinkedAccount {
  provider: Provider;
  email?: string;
  name?: string;
  avatar?: string;
  linkedAt?: string;
}

const PROVIDERS: { id: Provider; label: string; icon: typeof Chrome }[] = [
  { id: "google", label: "Google", icon: Chrome },
  { id: "apple", label: "Apple", icon: Apple },
];

/**
 * 10.11 companion — links/unlinks OAuth providers via the backend's
 * `auth.social.*` routes. "Connect" reuses `getSocialLoginUrl` (the same
 * helper the login page uses) since `GET auth.social.login` returns JSON
 * `{redirectUrl}`, not an HTTP redirect — navigating straight to that
 * endpoint would just show raw JSON.
 */
export default function SocialAccountsCard() {
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<LinkedAccount[] | { accounts?: LinkedAccount[] }>(apiRoutes.auth.social.accounts, {
        signal: controller.signal,
      })
      .then((payload) => {
        // Backend wraps the list as `{ success, data: { accounts: [...] } }`;
        // accept a bare array too in case the envelope changes.
        const list = Array.isArray(payload) ? payload : payload?.accounts;
        setAccounts(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Non-fatal: the card still renders "connect" actions for every provider.
        setAccounts([]);
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  function isConnected(provider: Provider): boolean {
    // The API has no `connected` flag — an account's presence in the list means it is linked.
    return Array.isArray(accounts) && accounts.some((a) => a.provider === provider);
  }

  async function handleConnect(provider: Provider) {
    setPendingProvider(provider);
    try {
      const url = await getSocialLoginUrl(provider);
      window.location.assign(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر بدء عملية الربط، حاول مرة أخرى.";
      toast.error(message);
      setPendingProvider(null);
    }
  }

  async function handleDisconnect(provider: Provider) {
    setPendingProvider(provider);
    try {
      await apiClient.post(apiRoutes.auth.social.unlink, { provider });
      setAccounts((prev) => (Array.isArray(prev) ? prev.filter((a) => a.provider !== provider) : []));
      toast.success("تم فصل الحساب بنجاح");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر فصل الحساب، حاول مرة أخرى.";
      toast.error(message);
    } finally {
      setPendingProvider(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" /> الحسابات المرتبطة
        </CardTitle>
        <CardDescription>سجّل الدخول بشكل أسرع عبر ربط حساب Google أو Apple.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : (
          PROVIDERS.map(({ id, label, icon: Icon }) => {
            const connected = isConnected(id);
            const isPending = pendingProvider === id;
            return (
              <div key={id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {connected ? "متصل" : "غير متصل"}
                    </p>
                  </div>
                </div>
                {connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isPending}
                    onClick={() => handleDisconnect(id)}
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2Off className="w-4 h-4" />}
                    فصل
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleConnect(id)}>
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    ربط الحساب
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

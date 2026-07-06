"use client";

import { useMySessions } from "@/hooks/use-session-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Monitor, Smartphone, Globe, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function SecuritySettings() {
  const { sessions, isLoading, revokeSession } = useMySessions();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>الأجهزة المتصلة</CardTitle>
          </div>
          <CardDescription>
            هذه هي الأجهزة التي سجلت الدخول منها مؤخراً. إذا لاحظت جهازاً غريباً، قم بإنهاء الجلسة فوراً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد جلسات نشطة.</p>
          ) : (
            sessions.map((session) => {
              const Icon = session.deviceType === "mobile" ? Smartphone : Monitor;
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {session.os || "نظام غير معروف"} - {session.browser || "متصفح غير معروف"}
                        </p>
                        {session.isCurrentDevice && (
                          <Badge variant="secondary" className="text-xs">
                            الجهاز الحالي
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {session.ipAddress} {session.location ? `(${session.location})` : ""}
                        </span>
                        <span>
                          آخر نشاط:{" "}
                          {formatDistanceToNow(new Date(session.lastActiveAt), {
                            addSuffix: true,
                            locale: ar,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!session.isCurrentDevice && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                    >
                      إنهاء الجلسة
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">التحقق بخطوتين (MFA)</CardTitle>
          </div>
          <CardDescription>
            أضف طبقة حماية إضافية لحسابك لمنع الوصول غير المصرح به.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">تطبيق المصادقة (Authenticator App)</p>
              <p className="text-sm text-muted-foreground">
                استخدم تطبيقات مثل Google Authenticator لإنشاء رموز أمان.
              </p>
            </div>
            <Button variant="outline">إعداد</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}